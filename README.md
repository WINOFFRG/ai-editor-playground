# AI Editor Playground

## Installation

1. Clone the repository
2. Run `bun install`
3. Create a `.env.local` file and add the following variables:
    - `AZURE_API_KEY`       - Azure API Key
    - `AZURE_RESOURCE_NAME` - Azure Resource Name
    - `AUTH_TOKEN`          - Authentication Token for API call
4. Run `bun run dev`

## Features

1. An WYSIWYG editor built on prosemirror
2. Uses xstate for state management
3. Uses @ai-sdk for data fetching and API interface
4. Uses azure ai foundary gpt-4 model behind the scenes