<#
ftp_upload.ps1
PowerShell script to recursively upload a local directory to a remote FTP server.

Usage example:
.
  .\ftp_upload.ps1 -Server "ftp://example.com" -Username "ftpuser" -Password (Read-Host -AsSecureString) -LocalPath "." -RemotePath "/public_html/calcetto"

Notes:
- This script runs in PowerShell 5.1 (Windows). It uses FtpWebRequest and will attempt
  to create remote directories as needed. If a MakeDirectory call fails because the
  directory already exists, that error is ignored.
- Password can be passed as a SecureString or plain string. If a SecureString is used,
  it will be converted to plain text for credential creation only in-memory.
#>

param(
    [Parameter(Mandatory=$true)][string]$Server,
    [Parameter(Mandatory=$true)][string]$Username,
    [Parameter(Mandatory=$true)][object]$Password,
    [string]$LocalPath = ".",
    [string]$RemotePath = "/",
    [switch]$UsePassive
)

function ConvertTo-PlainText([System.Security.SecureString]$secure) {
    if ($null -eq $secure) { return $null }
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

if ($Password -is [System.Security.SecureString]) {
    $plainPwd = ConvertTo-PlainText $Password
} else {
    $plainPwd = [string]$Password
}

$creds = New-Object System.Net.NetworkCredential($Username, $plainPwd)

function Ensure-RemoteDir($baseUri, $remoteDir) {
    # remoteDir is like /path/to/dir
    $parts = $remoteDir.Trim('/').Split('/') | Where-Object { $_ -ne '' }
    $accum = ""
    foreach ($part in $parts) {
        $accum = $accum + '/' + $part
        $uri = [System.Uri]::EscapeUriString($baseUri.TrimEnd('/') + $accum)
        try {
            $req = [System.Net.FtpWebRequest]::Create($uri)
            $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
            $req.Credentials = $creds
            if ($UsePassive) { $req.UsePassive = $true } else { $req.UsePassive = $false }
            $req.GetResponse() | Out-Null
        } catch {
            # Ignore errors (directory may already exist)
        }
    }
}

function Upload-FileToFtp($baseUri, $remoteFilePath, $localFilePath) {
    $uri = [System.Uri]::EscapeUriString($baseUri.TrimEnd('/') + '/' + $remoteFilePath.TrimStart('/'))
    $req = [System.Net.FtpWebRequest]::Create($uri)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $req.Credentials = $creds
    $req.UseBinary = $true
    if ($UsePassive) { $req.UsePassive = $true } else { $req.UsePassive = $false }

    $bytes = [System.IO.File]::ReadAllBytes($localFilePath)
    $req.ContentLength = $bytes.Length
    $rs = $req.GetRequestStream()
    try {
        $rs.Write($bytes, 0, $bytes.Length)
    } finally {
        $rs.Close()
    }
    try { $req.GetResponse() | Out-Null } catch { }
}

function Upload-Directory($localRoot, $remoteRoot) {
    $files = Get-ChildItem -Path $localRoot -Recurse -File
    foreach ($f in $files) {
        $relative = $f.FullName.Substring($localRoot.TrimEnd('\').Length).TrimStart('\')
        $remoteRelative = $relative -replace '\\','/'

        $remoteDir = [System.IO.Path]::GetDirectoryName($remoteRelative) -replace '\\','/'
        if ($remoteDir -and $remoteDir -ne '.') {
            Ensure-RemoteDir $Server ($remoteRoot.TrimEnd('/') + '/' + $remoteDir)
        } else {
            Ensure-RemoteDir $Server $remoteRoot
        }

        $remoteFilePath = ($remoteRoot.TrimEnd('/') + '/' + $remoteRelative).TrimStart('/')
        Write-Host "Uploading $($f.FullName) -> $remoteFilePath"
        Upload-FileToFtp $Server $remoteFilePath $f.FullName
    }
}

# Normalize paths
$localFull = Resolve-Path -Path $LocalPath
$localFullPath = $localFull.Path

if (-not $RemotePath) { $RemotePath = '/' }

Write-Host "Starting FTP upload from '$localFullPath' to '$Server$RemotePath' as user '$Username'"
Upload-Directory $localFullPath $RemotePath
Write-Host "Upload complete."
