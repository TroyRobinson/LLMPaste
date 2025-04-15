# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build / Test Commands
- Load the extension in Chrome: Navigate to chrome://extensions/, enable Developer mode, click "Load unpacked", select the extension directory
- Debug mode: Set `DEBUG = true` in content.js to enable verbose logging in browser console

## Code Style Guidelines
- Follow existing variable naming conventions (camelCase)
- Use consistent indentation (2 spaces)
- Maintain error handling with try/catch blocks when accessing Chrome APIs
- Handle edge cases and provide fallback mechanisms
- Use descriptive variable and function names
- Log debug info using the existing debugLog() helper function
- Keep code modular with specific functions for different editor types
- Follow existing DOM manipulation patterns for UI elements
- Use Chrome storage API for saving settings
- Maintain event-driven architecture for extension operations