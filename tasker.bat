@echo off

REM Batch file to start the tasker app using nodejs
REM RLMG, 2024


REM Wait a few seconds for OS to finish starting
timeout 10

REM Start program

cd C:\RLMG\tasker
node tasker.mjs

