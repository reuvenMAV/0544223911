# OpenClaw + n8n: 3-Server Installation Guide (Hebrew)

This repository now includes a full Hebrew setup guide for deploying OpenClaw + n8n across 3 servers (Primary, Workers, Standby), including:

- secure gateway binding (`loopback`)
- n8n + Redis queue architecture
- Google Workspace, DB, and Browser webhooks
- standby failover and watchdog strategy
- smoke tests, monitoring, and troubleshooting

## Guide file

- [`OPENCLAW_N8N_3_SERVER_INSTALL_HE.md`](./OPENCLAW_N8N_3_SERVER_INSTALL_HE.md)

## Scope

The guide is intended for production-style Linux deployments with:

- Ubuntu 24.04 LTS
- Node.js 24
- Tailscale network segmentation
- Dockerized n8n



