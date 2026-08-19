<#
============================================================================
 link-skills.ps1 — link all sap-toolkit skills into a PROJECT's .axet-code\skills\

 aXet.code scans the PROJECT-level .axet-code\skills\ directory (relative to the
 folder you launch it in), NOT a user-global one. Run this once per project.

 Usage (from anywhere):
   powershell -ExecutionPolicy Bypass -File <repo>\scripts\link-skills.ps1 [TargetProjectDir] [-Copy]
     TargetProjectDir  defaults to the current directory.
     -Copy             Copy REAL folders instead of junctioning. Use this if
                       aXet.code doesn't discover junctioned skills (some scanners
                       skip reparse points). Re-run after `git pull` to refresh.

 aXet.code discovers skills at STARTUP, so RESTART it after running this.
 Junctions (mklink /J) work without admin on local drives. Re-runnable.
============================================================================
#>
param(
  [string]$TargetProjectDir = (Get-Location).Path,
  [switch]$Copy
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot          # repo root (parent of \scripts)
$dest = Join-Path $TargetProjectDir ".axet-code\skills"

# skill-name => path relative to repo root
$skills = [ordered]@{
  "sap-adt-readonly"          = "abaper\skills\sap-adt-readonly"
  "clean-core"                = "abaper\skills\clean-core"
  "sap-docs"                  = "abaper\skills\sap-docs"
  "screen-gen"                = "abaper\skills\screen-gen"
  "fs2ts"                     = "abaper\skills\fs2ts"
  "fs-generator"              = "abaper\skills\fs-generator"
  "abapgit-workflow"          = "abapgit-bridge\skills\abapgit-workflow"
  "abapgit-export-zip"        = "abapgit-bridge\skills\abapgit-export-zip"
  "abapgit-import-status-zip" = "abapgit-bridge\skills\abapgit-import-status-zip"
  "abapgit-howto"             = "abapgit-bridge\skills\abapgit-howto"
  "office-excel-read"         = "office-tools\skills\office-excel-read"
  "office-excel-write"        = "office-tools\skills\office-excel-write"
  "office-excel-transform"    = "office-tools\skills\office-excel-transform"
  "office-excel-report"       = "office-tools\skills\office-excel-report"
  "office-excel-compare"      = "office-tools\skills\office-excel-compare"
  "office-excel-images"       = "office-tools\skills\office-excel-images"
  "office-slides"             = "office-tools\skills\office-slides"
  "office-pdf"                = "office-tools\skills\office-pdf"
  "office-pptx"               = "office-tools\skills\office-pptx"
  "office-docx"               = "office-tools\skills\office-docx"
  "office-manual"             = "office-tools\skills\office-manual"
}

$mode = if ($Copy) { "copy" } else { "junction" }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Write-Host "Repo:   $repo"
Write-Host "Target: $dest"
Write-Host "Mode:   $mode"
$n = 0
foreach ($name in $skills.Keys) {
  $src = Join-Path $repo $skills[$name]
  if (-not (Test-Path (Join-Path $src "SKILL.md"))) {
    Write-Warning "SKIP $name - no SKILL.md at $src"; continue
  }
  $linkPath = Join-Path $dest $name
  cmd /c rmdir "$linkPath" 2>$null
  Remove-Item -Recurse -Force $linkPath -ErrorAction SilentlyContinue
  if ($Copy) {
    Copy-Item -Recurse -Force $src $linkPath
  } else {
    cmd /c mklink /J "$linkPath" "$src" | Out-Null
  }
  Write-Host "  + $name"
  $n++
}
Write-Host "Installed $n skills ($mode). RESTART aXet.code in this project to discover them."
if ($Copy) { Write-Host "Note: copies are a snapshot - re-run with -Copy after 'git pull' to refresh." }
