# IcpFinder for macOS

Find your ICPs and prove why now. Every fact is checked on 2 websites, and all AI runs on the Claude Code login you already have. No API keys.

## Run it

You need [Claude Code](https://code.claude.com) installed and signed in (`claude` in Terminal).

```bash
bun install
cd packages/desktop
bun run dev
```

## How it works

1. **Setup wizard (blocking):** your product's website becomes a workspace. IcpFinder reads it, you confirm the read, and it finds 3 ICPs.
2. **ICP launcher:** the sidebar lists your ICPs. Picking one sets the main screen: its pain, signals, and the companies found.
3. **Research:** each company is researched in the background, one at a time. Claude finds sources; code opens every page and checks the quote. A fact is *proven* only with 2+ websites.
4. **Your product page:** edit what IcpFinder knows about your product and re-check your ICPs.

Data lives in `~/Library/Application Support/IcpFinder/icpfinder.json`. Set `ICPFINDER_DATA_DIR` to use another folder.

## Credits

The ICP and hunting method borrows ideas, rewritten in our own words, from [gtmskills.com](https://www.gtmskills.com/) (MIT, by Swan and its authors): yes/no gates with a named public source (icp-matrix-builder), one gate change per refinement round and "table stakes" pruning (icp-builder), tiered sources with root-domain dedupe (market-finder), and observable "why now" signals (website-to-signals).
