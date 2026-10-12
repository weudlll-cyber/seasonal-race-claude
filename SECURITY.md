# Security policy

**Owns:** how to report a security problem in RaceArena, what counts as one, and which version gets
fixes. How the app protects itself is [docs/AUTH.md](docs/AUTH.md)'s; how to run a server safely is
[docs/OPERATOR-GUIDE.md](docs/OPERATOR-GUIDE.md)'s.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.** Report it privately through GitHub:
open the repository's **Security** tab and choose **Report a vulnerability** (GitHub's private
vulnerability reporting). Only the maintainer sees the report.

Helpful in a report: what an attacker can do, the steps or a request that shows it, the version or
commit, and the install path (Node, Docker or the VPS install).

A contact e-mail address for reports will be added here once the project has its own domain. Until
then, GitHub's private reporting is the only channel.

## What is in scope

- the server (`server/`) — sign-in, sessions, roles, the API, uploads and the stored data;
- the browser app (`client/`) as the server delivers it;
- the shipped Docker image (`server/Dockerfile`) and `docker-compose.yml`;
- the install, configure, backup, restore and status scripts in this repository.

## What is out of scope

- the hosting around an install: the server, its operating system, firewall, proxy, DNS and
  certificates, which the operator runs;
- social engineering, phishing, and physical access to a machine;
- denial of service by sheer traffic volume;
- vulnerabilities in a dependency that RaceArena cannot reach — please report those to the
  dependency;
- an install whose operator changed the shipped security settings (for example an unencrypted
  sign-in cookie on a public address).

## Supported versions

Only the **newest release** receives security fixes. An older install is fixed by updating
([docs/OPERATOR-GUIDE.md](docs/OPERATOR-GUIDE.md), *Updates and rollback*). No release is tagged
yet; until the first one is, fixes land on `master`.
