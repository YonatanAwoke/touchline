This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
z
## Local SMTP / Email testing

To test sending emails (for features like early access notifications) locally, provide SMTP environment variables. You can use Mailtrap for safe testing:

- Copy `.env.example` to `.env.local` at the project root of `apps/backend` and fill values:

```bash
cp .env.example .env.local
# edit .env.local and add your Mailtrap or SMTP credentials
```

- Mailtrap SMTP details are available in your Mailtrap inbox settings. Typical values:

```
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=<mailtrap_user>
SMTP_PASS=<mailtrap_pass>
SMTP_SECURE=false
FROM_EMAIL="Touchline <demomailtrap.co>"
```

- Start the backend dev server and trigger the endpoint (frontend Early Access form or curl). Mailtrap will capture the outgoing email so you can preview it safely.

