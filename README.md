# Demo Night App 🧬

**The [Demo Night App (DNA)](https://demos.aicollective.com) is an open-source, community-led project we use to maximize value for all involved at our flagship demo night events!**

![App Screenshots](./assets/App.png)

<a href="https://www.loom.com/share/20bb08ab431040cf878a8a654860efab">
  <img src="https://cdn.loom.com/sessions/thumbnails/20bb08ab431040cf878a8a654860efab-29f338a04a89eb3c-full-play.gif">
</a>

## 🚀 What is Demo Night?

_An evening of live demos and collaboration with the innovators shaping tomorrow_. Here's an [example event](https://lu.ma/demo-night)!

## 🧑‍💻 Contributing

If you'd like to contribute to this community project, check out our [issues](https://github.com/the-ai-collective/demo-night-app/issues) to find tasks you can help with!

Feel free to reach out to us at [engineering@aicollective.com](mailto:engineering@aicollective.com)! 😄

## 📚 Documentation

- **[Development Guide](./DEVELOPMENT.md)**: How to set up the app locally, run the database, and test features like Match Mode.
- **[Deployment Guide](./DEPLOYMENT.md)**: How to deploy the application to production (Vercel).
- **[Migration Troubleshooting](./MIGRATION_TROUBLESHOOTING.md)**: Troubleshooting guide if `yarn db:migrate` fails on Windows.

## ⚙️ Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Start database (Docker)
./start-database.sh
# Windows: .\start-database.ps1

# 3. Run migrations
yarn db:migrate
# Windows Native: If this fails, use .\apply-migrations-via-docker.ps1
# Windows WSL2: ✅ Works perfectly! Just use WSL terminal instead.

# 4. Start dev server
yarn dev
```

For detailed instructions, please see the [Development Guide](./DEVELOPMENT.md).

**Windows Users**: 
- **✅ Recommended**: Use WSL2 - Prisma commands work perfectly! See [Migration Troubleshooting Guide](./MIGRATION_TROUBLESHOOTING.md).
- **Alternative**: If WSL2 isn't available, use the Docker workaround scripts.
