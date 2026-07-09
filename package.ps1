[CmdletBinding()]
param(
  [string]$ExtensionDir = "bug-black-box",
  [string]$DistDir = "dist"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$extensionPath = Join-Path $repoRoot $ExtensionDir
$distPath = Join-Path $repoRoot $DistDir

if (-not (Test-Path -LiteralPath $extensionPath -PathType Container)) {
  throw "Extension directory not found: $extensionPath"
}

$manifestPath = Join-Path $extensionPath "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "Manifest not found: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if (-not $manifest.version) {
  throw "manifest.json must include a version."
}

New-Item -ItemType Directory -Force -Path $distPath | Out-Null

$packageName = "bug-black-box-v$($manifest.version).zip"
$packagePath = Join-Path $distPath $packageName
$stagingPath = Join-Path $distPath "_package-staging"

if (Test-Path -LiteralPath $stagingPath) {
  Remove-Item -LiteralPath $stagingPath -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stagingPath | Out-Null

$excludeDirectories = @(".git", ".task", "docs", "dist", "scripts")
$excludeFiles = @("*.ps1", "*.md", "*.map")

Get-ChildItem -LiteralPath $extensionPath -Force | Where-Object {
  if ($_.PSIsContainer) {
    return $excludeDirectories -notcontains $_.Name
  }

  foreach ($pattern in $excludeFiles) {
    if ($_.Name -like $pattern) {
      return $false
    }
  }

  return $true
} | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $stagingPath -Recurse -Force
}

if (Test-Path -LiteralPath $packagePath) {
  Remove-Item -LiteralPath $packagePath -Force
}

Compress-Archive -Path (Join-Path $stagingPath "*") -DestinationPath $packagePath -Force
Remove-Item -LiteralPath $stagingPath -Recurse -Force

Write-Host "Created $packagePath"
