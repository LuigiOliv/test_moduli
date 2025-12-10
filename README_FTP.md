# FTP Upload Instructions

This project contains a helper PowerShell script `ftp_upload.ps1` to upload the contents
of the project (or a chosen subfolder) to a remote FTP server. This environment cannot
connect directly to your FTP host, but you can run the script locally from your machine
to push files to your hosting space.

Quick usage (PowerShell 5.1):

1. Open PowerShell in the project root (where `ftp_upload.ps1` is located).

2. Run the script with required parameters. Example (you will be prompted for secure password):

```powershell
# Secure prompt for password
$pwd = Read-Host "FTP Password" -AsSecureString
.\ftp_upload.ps1 -Server "ftp://ftp.example.com" -Username "ftpuser" -Password $pwd -LocalPath "." -RemotePath "/public_html/calcetto"
```

3. Or pass a plain password (less secure):

```powershell
.\ftp_upload.ps1 -Server "ftp://ftp.example.com" -Username "ftpuser" -Password "cleartextpwd" -LocalPath "." -RemotePath "/public_html/calcetto"
```

Script behavior and notes:
- The script will recursively walk `-LocalPath` and upload files preserving directory structure under `-RemotePath`.
- It attempts to create remote directories using FTP `MKD`. If they already exist, errors are ignored.
- If your host requires FTPS (secure FTP over TLS) this script will not perform TLS; you'd need an FTPS-capable client (WinSCP, FileZilla) or a more advanced script.
- For large sites consider using an FTP client with resume capability.

Security reminder:
- Prefer `-Password (Read-Host -AsSecureString)` to avoid keeping cleartext credentials in your shell history.

If you want, I can also:
- generate a `.ftppass` / `.ftpconfig` for popular editors (VSCode FTP extension), or
- scaffold a basic GitHub Actions workflow that deploys to FTP automatically when you push to a branch.

Automatic deploys with GitHub Actions
-------------------------------------

You can use the included GitHub Actions workflow to automatically deploy the repository to your FTP host when you push to `main`.

1. In your GitHub repository, go to `Settings` → `Secrets and variables` → `Actions` → `New repository secret` and add the following secrets:
	- `FTP_HOST` — the FTP server URL or hostname (e.g. `ftp.example.com`)
	- `FTP_USERNAME` — your FTP username
	- `FTP_PASSWORD` — your FTP password
	- `FTP_SERVER_DIR` — the remote path where files should be uploaded (e.g. `/public_html/calcetto`)

2. The workflow file is at `.github/workflows/deploy-ftp.yml`. By default it triggers on pushes to `main`. Change the branch in the workflow if you prefer another branch.

3. Commit and push your changes. GitHub Actions will run the workflow and upload the repository files to the remote FTP path.

Notes & troubleshooting:
- The workflow uses the `SamKirkland/FTP-Deploy-Action` which speaks plain FTP. If your host requires SFTP/FTPS, use a different action (e.g. an SFTP action or a WinSCP script).
- The workflow uploads the repository root. If you only want to deploy a build output (e.g. `dist/`), edit `local-dir` in the workflow to point to that folder.
- If files are not appearing, check the workflow run logs in the Actions tab for details.

