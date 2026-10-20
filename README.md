# TaxDesk

TaxDesk is a desktop app for practising Pakistani tax returns the way they are prepared in IRIS. It covers the
Income Tax Ordinance 2001, the Income Tax Rules 2002, the Sales Tax Act 1990 and the Sales Tax Rules 2006, and
explains every figure and cites every section.

It is a learning tool, not FBR's IRIS, and is not connected to FBR.

## Download

Go to **[Releases](https://github.com/majmalzaib/taxdesk-downloads/releases/latest)** and download:

- **Windows 10/11:** `TaxDeskSetup-x.y.z.exe`. Run it. If Windows SmartScreen warns you, choose
  *More info → Run anyway*.
- **Mac (Apple silicon, M1 or later):** `TaxDesk-mac.dmg`. Open it and drag TaxDesk into Applications. The first time,
  right-click TaxDesk and choose **Open → Open**.

TaxDesk needs a **licence key**, which it asks for when it first opens. Contact the owner to get one.

## What TaxDesk sends over the internet

- Each time it starts, it reads `control.json` in this repository, for the owner's messages, update notices and
  licence status.
- If the owner has set it up, it sends an anonymous usage record: app version, operating system, a random install
  number and your licence number.
- **Ask TaxDesk**, the optional assistant, sends your questions, and any document you attach, to Anthropic's Claude
  using your own API key.

Your returns and documents never leave your computer otherwise.

## Terms

See [TERMS.md](TERMS.md).
