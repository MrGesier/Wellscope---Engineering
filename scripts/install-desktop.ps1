param([string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'Programs\WellScope'))
$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path $PSScriptRoot -Parent
$target = [IO.Path]::GetFullPath($InstallDirectory)
$marker = Join-Path $target '.wellscope-install.json'
if ((Test-Path -LiteralPath $target) -and !(Test-Path -LiteralPath $marker)) {
    throw "Refusing to overwrite an unrecognized directory: $target"
}
New-Item -ItemType Directory -Path $target -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceRoot 'app') -Destination $target -Recurse -Force
Copy-Item -LiteralPath (Join-Path $sourceRoot 'LAUNCH_WELLSCOPE.cmd') -Destination $target -Force
@{ application='WellScope'; installed_utc=[DateTime]::UtcNow.ToString('o'); source=$sourceRoot } | ConvertTo-Json | Set-Content -LiteralPath $marker
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'WellScope Engineering.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$edge = Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'
$index = Join-Path $target 'app\index.html'
if (Test-Path -LiteralPath $edge) {
    $shortcut.TargetPath = $edge
    $shortcut.Arguments = '--app="' + ([Uri]$index).AbsoluteUri + '"'
} else {
    $shortcut.TargetPath = Join-Path $target 'LAUNCH_WELLSCOPE.cmd'
}
$shortcut.WorkingDirectory = $target
$shortcut.Description = 'WellScope Engineering — offline evidence and geometry workbench'
$shortcut.IconLocation = (Join-Path $target 'app\assets\wellscope.ico') + ',0'
$shortcut.Save()
Write-Output "Installed: $target"
Write-Output "Desktop shortcut: $shortcutPath"
