# Advanced Note Mover

[Obsidian](https://obsidian.md) plugin that moves Markdown notes into folder destinations based on **configurable rules** (tags, paths, properties, dates, links, and more), with optional **blacklist filters**, **automation**, **preview**, and **move history / undo**.

**Documentation:** see the `[Documentation](docs/README.md)` wiki for rules, operators, templates, filters, and commands (written from the current implementation).

## Features

- **Rule-based routing:** ordered rules with multiple triggers and `all` / `any` / `none` aggregation; first matching active rule wins.
- **Rich criteria:** filenames, parent folder, extension, tags, wiki links & embeds, headings, created/modified times, and frontmatter properties (typed operators).
- **Destination templates**: build target paths from tags and properties using `{{tag....}}` and `{{property....}}` placeholders.
- **Blacklist filters**: exclude notes by tag, path, filename pattern, property, date prefix, or body substring (`content:`).
- **Commands**: move the active note, move all Markdown notes, previews, history, and “add current file to blacklist.”
- **Automation**: optional move-on-edit (debounced) and periodic full-vault passes.
- **Performance options**: rule evaluation cache and vault index cache; optional performance tracing for debugging.

## Requirements

- Obsidian **1.5.0** or newer (see `manifest.json`).

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, branch workflow, checks before a PR (`npm test`, lint, format), and review expectations.

## Development

| Script                                    | Purpose                                          |
| ----------------------------------------- | ------------------------------------------------ |
| `npm run dev`                             | Generate changelog artifact and bundle (esbuild) |
| `npm run build`                           | Typecheck, generate changelog, production bundle |
| `npm run test` / `npm run test:watch`     | Vitest                                           |
| `npm run lint` / `npm run lint:fix`       | ESLint                                           |
| `npm run format` / `npm run format:check` | Prettier                                         |

Changelog text for the in-app modal is generated from `CHANGELOG.md` at build time (`npm run generate-changelog`).

Git hooks (Husky) run lint-staged on commit where configured.

## License

MIT — see [LICENSE](LICENSE).
