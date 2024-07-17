# Tasker Utility

Background task to receive and perform sleep and shutdown commands. 

## Project Setup

[Installation instructions for PM2 available here](https://rlmg.bitdocs.ai/share/d/ij1VRefgZV3B1N65).

This is a node app that can be run in a terminal, docker or using a process manager like PM2. The app requires admin or root access to function.

There are no dependencies so npm is not required to install packages. In fact, only the tasker.mjs file is required.

## Sending Commands

Commands are sent using UDP connections. Because this is UDP, there is no response when a command is sent. Commands can be sent with following carriage return or line feed. White space is ignored. Commands are:

sleep - most common
shutdown - 
reboot - 
ping - writes "pong" to stdout for testing
beep - play a sound, useful for testing

## Network Setup
Default port: 7003

Default IP address: 0.0.0.0 (all externally available interfaces)

Settings can be changed in a config file, config.json. This file is now required. These settings can be overwritten with environmental variables: TASKER_PORT and TASKER_HOST. Finally, these settings can be overwritten in the commmand line with PORT and HOST arguments.

## Installation
1. Copy the Tasker folder to C:/RLMG/

2. Install a current LTS version of node using a standard install method.

3. I recommend using a process manager like PM2
- install PM2: npm install pm2 -g
- run with PM2: pm2 start C:/RLMG/Tasker/tasker.mjs

4. Set up a batch file in Startup Items or a shell script that can be launched several ways. 

Note: the simplest way to run is node C:/RLMG/Tasker/tasker.mjs

## Running with PM2

With PM2 installed, simply run `npm start` from this directory to launch PM2 with the config settings in the `ecosystem.config.js` file.
