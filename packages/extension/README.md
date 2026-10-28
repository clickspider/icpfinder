# IcpFinder for Chrome

A small browser extension for the IcpFinder Mac app. Each morning the app asks
for a few Reddit, X or LinkedIn search pages; the extension opens them in a
minimized window of your own browser (where you are signed in), copies the
visible text, closes the window and sends the text to the app on
`127.0.0.1:47321`. It only reads. It never clicks, types, likes or posts.

Install once in Chrome or Comet: open the extensions page, turn on Developer
mode, choose "Load unpacked" and pick this folder. The app shows the status in
Settings → Browser.
