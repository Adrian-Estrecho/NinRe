# Deployment plan

Decided 2026-10-30. NinRe launches as a **website only**, on **AWS Lightsail** in Singapore. App Store and Play Store apps come later.

## Why Lightsail

- **The data stays put.** SQLite and the `uploads/` folder live on the instance's own SSD, which survives restarts and deploys. The app runs as it is, with no code changes.
- **Bandwidth is included.** Photos are most of the traffic, and every photo is served through Express. The $12 plan includes 3 TB of transfer a month. On Render, transfer past 5 GB costs $0.15/GB.
- **The bill stays flat.** It doesn't grow with traffic until the server itself runs out of room.
- **Singapore** is the closest region to PayMongo and GCash users.

The trade-off is that we look after the server ourselves: OS updates, HTTPS, the Node service and backups. Render does all of that for about the same price at low traffic, so it is the fallback if running a server becomes a chore. Its free plan also works for demos, but it wipes the data on every deploy and whenever the service sleeps.

## Setup

| Piece | Choice |
| --- | --- |
| Instance | Lightsail Linux, 2 GB RAM, 3 TB transfer, Singapore. About **$12 a month**. |
| Runtime | Node 24 (22.18 at the least), run by systemd as `npm start` |
| HTTPS | Caddy in front of port 4000 (free automatic certificates) |
| Data | `DATA_DIR=/var/lib/ninre` on the instance disk |
| Deploys | `deploy/lightsail/update.sh` pulls `main`, builds and restarts, so each deploy takes the site down for a few seconds. For now you run it by hand over SSH. A GitHub Actions workflow that runs it on every push to `main` is still to be written. |
| Backups | Automatic Lightsail snapshots of the whole disk (about $0.05/GB a month). On top of that, `backup.sh` makes a nightly copy of `ninre.sqlite` and keeps 14 days. |
| Environment | `/etc/ninre/ninre.env`: `APP_URL`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` (see [README](../README.md#configuration)) |

The files are in [deploy/lightsail/](../deploy/lightsail/).

### First deploy

1. In Lightsail, create an instance: Linux, **Ubuntu 24.04**, Singapore, the $12 plan.
2. Attach a **static IP**. It's free while attached to an instance.
3. Under Networking, open **HTTPS (443)** in the firewall.
4. Turn on **automatic snapshots**.
5. Point the domain's A record at the static IP.
6. SSH in and run the following. If the repo is private, add a deploy key and clone with the `git@github.com:` URL instead.

   ```bash
   sudo install -d -o ubuntu -g ubuntu /opt/ninre
   git clone https://github.com/Adrian-Estrecho/NinRe.git /opt/ninre
   bash /opt/ninre/deploy/lightsail/setup.sh your-domain.com
   ```
7. Put the PayMongo keys in `/etc/ninre/ninre.env`, then run `sudo systemctl restart ninre`.

Each later deploy is `bash /opt/ninre/deploy/lightsail/update.sh`. Logs are in `journalctl -u ninre -f`.

## Cost, first year

| Item | Cost |
| --- | --- |
| Lightsail 2 GB | $144 |
| Snapshots | about $12–24 |
| Domain | about $12 |
| **Total** | **about $170**, plus PayMongo's fees on payments |

New AWS accounts get up to $200 of Free Plan credit for 6 months, which covers the first months.

These prices were checked in October 2026. Confirm them on the Lightsail pricing page before signing up.

## When to change the setup

Stay on one server until one of these happens:

1. **The server runs short of memory or CPU.** Move to a bigger Lightsail plan first: 4 GB costs $24.
2. **A few seconds of downtime per deploy, or a single server, is no longer acceptable.** Then:
   - move the database from SQLite to Postgres (Neon, Singapore);
   - move photos to Cloudflare R2, with signed links for uploading and viewing;
   - run two or more app servers behind a load balancer.

   This is the large refactor: `db.ts` uses synchronous `node:sqlite`, and every call to it would become async. At that point a container platform with managed Postgres costs about $40–60 a month at first.

## Store apps (later)

Most of what the store apps need is the step 2 work above, plus a new way to sign in:

- **Wrapper:** Capacitor around the existing React client.
- **Login:** add bearer-token sign-in for the apps. The apps load from `capacitor://localhost`, and the current `SameSite=Lax` cookie with its same-site check refuses requests from there.
- **Fees:** Apple Developer Program is $99 a year. Google Play is $25 once.
- **iOS builds from Windows:** Codemagic gives 500 free macOS minutes a month.
- **Google's tester rule:** a new *personal* Play account must run a closed test with 12 testers for 14 days in a row before it can publish. An organisation account (with a free D-U-N-S number) is exempt.
- **Payments:** subscriptions sold inside the apps must go through Apple's or Google's billing, which takes 15%. The plan for v1 is a free companion app that sells nothing inside it: people subscribe on the website and sign in on the app.
- **Apple review:** Apple rejects apps that are only a wrapped website. Add native features: the photo picker or camera, and push notifications.
- **Already in place:** in-app account deletion (Apple requires it).
- **Still to write:** a privacy policy page.
