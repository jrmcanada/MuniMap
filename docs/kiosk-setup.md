# Setting up the display PC

This is how to turn a Windows PC with Edge into the wall display. It takes about 20 minutes. Do it once.

## What you need

- A Windows PC with Edge and Node (version 20 or newer).
- The project folder on that PC.
- A dedicated Windows account for the display, with no other access (see step 3).

## Steps

1. **Build the app.** In the project folder, run `npm install`, then `npm run build`.
2. **Try it once by hand.** Run `powershell -ExecutionPolicy Bypass -File scripts\start-kiosk.ps1`. Edge should open full screen on the map within a minute. This is also where you find out if your version of Edge ignores one of the launch flags. If a bubble or a prompt shows up on screen, write down which one. The script keeps running, so to end this test run `powershell -ExecutionPolicy Bypass -File scripts\stop-kiosk.ps1`.
3. **Sign in on its own at boot.** Windows has to log in without anyone typing. That stores the account's password on the PC, so use the dedicated account from above and nothing else. Search for `netplwiz` in the Start menu, untick "Users must enter a user name and password", and enter the password when asked. On Windows 11 that checkbox can be missing. If so, go to Settings, Accounts, Sign-in options, turn off "For improved security, only allow Windows Hello sign-in for Microsoft accounts", and try again.
4. **Start the display at logon.** Press Win+R, type `shell:startup`, and make a shortcut in that folder with this target (use your real project path):

   ```
   powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\path\to\TMMMap\scripts\start-kiosk.ps1"
   ```

   The script has to be started with `-File`, because the stop script finds it that way.

5. **Keep the PC awake.** In Settings, System, Power, set both "Screen" and "Sleep" to Never. Turn off the lock screen timeout too. These settings do the real work. The app also asks Edge to keep the screen on, but Edge is free to say no.
6. **Keep Windows from restarting at a bad time.** In Settings, Windows Update, Advanced options, set active hours to cover the whole working day. Turn off notifications, or turn on Do not disturb.
7. **Reboot and look.** The map should appear on its own with nobody touching anything.

## What keeps it running

The script stays running in the background. Every 30 seconds it checks that the app's server answers and that Edge is open, and restarts whichever has stopped. Once a day at 4:00 am Toronto time the page reloads itself, and it reloads sooner if it freezes for 2 minutes.

The script writes no log files, so nothing grows on the disk. Edge itself can still use more and more memory over weeks. If you ever see it slow down, restarting the PC fixes it.

## Updating the app

1. Run `powershell -ExecutionPolicy Bypass -File scripts\stop-kiosk.ps1`. It stops the script, the server and the kiosk window.
2. Pull the new version, then run `npm install` if `package.json` changed, then `npm run build`.
3. Start the display again with the shortcut, or restart the PC.

Don't build while the server is running. The old server would send the new pages with the old files and the screen would break until a restart.

## Moving to Netlify later

Once the app is on Netlify, start the script with the address instead:

```
powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\path\to\TMMMap\scripts\start-kiosk.ps1" -Url https://your-site.netlify.app
```

The script then skips the local server and only keeps Edge open. Nothing else in the app changes.

## If something looks wrong

- **A cursor in the middle of the screen.** It hides after 3 seconds of no movement. Move the mouse and wait.
- **Edge comes up in a window, not full screen.** Press F11.
- **Black screen after boot.** Run the script by hand (step 2) and read what it says.
- **To leave the display and use the PC.** Run `powershell -ExecutionPolicy Bypass -File scripts\stop-kiosk.ps1`.
- **The script is already running.** Starting it twice does nothing: only one copy runs at a time.
- **Port.** The app is served on port 4183, which dev tools and the e2e tests don't use.
