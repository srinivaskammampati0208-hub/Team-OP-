# HealAI demo

## Run the app

Video rooms are created by the server, so do not open `index.html` directly.
Use Node.js 18 or newer and run the server from this directory:

```powershell
$env:DAILY_API_KEY = "your Daily API key"
node server.js
```

Open <http://127.0.0.1:8000>, sign in to the demo, and choose **Video call**.
The API key stays on the server and is never sent to the browser. Do not commit
or put it in a client-side file.

The server creates one-hour private Daily rooms with a two-person limit and
separate patient and clinician meeting tokens. Select a demo profile, create
the room, then send the clinician invite to your own doctor using a secure
channel. Profiles are fictional; selecting one does not contact or verify a
doctor.

Meeting links are bearer links: anyone who receives a link can use it. A
private room alone does not establish that your video provider, account, or
deployment meets healthcare privacy requirements. Confirm the appropriate
provider configuration and agreements before discussing sensitive health
information. This demo is not emergency care.

For a deployment beyond local demonstration, add real user authentication,
durable abuse protection, HTTPS, and privacy-compliant hosting before making
call creation available to the public.

## Verify

Run the focused server tests with:

```powershell
node --test server.test.js
```
