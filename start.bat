@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo First run: installing dependencies...
  call npm install
)
wscript //nologo "%~dp0start-hidden.vbs"
