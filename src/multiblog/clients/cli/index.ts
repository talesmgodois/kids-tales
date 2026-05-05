import {
  createPost,
  publishPost,
  registerBlog,
  shutdown,
} from "../../core";

function printHelp() {
  console.log(`
Multiblog CLI

Commands:
  register-blog --slug=<slug> --name=<name> --ghost-url=<url> --ghost-admin-key=<key>
  create-post --blog-slug=<slug> --title=<title> --html=<html>
  publish --blog-slug=<slug> --post-id=<uuid>

Examples:
  bun run src/multiblog/clients/cli/index.ts register-blog --slug=travel --name="Travel Blog" --ghost-url=http://localhost:2368 --ghost-admin-key=xxxxx:yyyyy
  bun run src/multiblog/clients/cli/index.ts create-post --blog-slug=travel --title="Hello" --html="<p>world</p>"
  bun run src/multiblog/clients/cli/index.ts publish --blog-slug=travel --post-id=<uuid>
`);
}

function parseArgs(args: string[]): Record<string, string> {
  return args.reduce<Record<string, string>>((acc, arg) => {
    if (!arg.startsWith("--")) return acc;
    const [key, ...rest] = arg.slice(2).split("=");
    acc[key] = rest.join("=");
    return acc;
  }, {});
}

async function main() {
  const [command, ...rest] = Bun.argv.slice(2);

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  const args = parseArgs(rest);

  try {
    switch (command) {
      case "register-blog": {
        const slug = args["slug"];
        const name = args["name"];
        const ghostUrl = args["ghost-url"];
        const ghostAdminKey = args["ghost-admin-key"];

        if (!slug || !name || !ghostUrl || !ghostAdminKey) {
          throw new Error(
            "Missing required args: --slug, --name, --ghost-url, --ghost-admin-key"
          );
        }

        const blog = await registerBlog({
          slug,
          name,
          ghostUrl,
          ghostAdminApiKey: ghostAdminKey,
        });
        console.log(JSON.stringify(blog, null, 2));
        return;
      }
      case "create-post": {
        const blogSlug = args["blog-slug"];
        const title = args["title"];
        const html = args["html"];

        if (!blogSlug || !title || !html) {
          throw new Error("Missing required args: --blog-slug, --title, --html");
        }

        const post = await createPost({ blogSlug, title, html });
        console.log(JSON.stringify(post, null, 2));
        return;
      }
      case "publish": {
        const blogSlug = args["blog-slug"];
        const postId = args["post-id"];

        if (!blogSlug || !postId) {
          throw new Error("Missing required args: --blog-slug, --post-id");
        }

        const post = await publishPost({ blogSlug, postId });
        console.log(JSON.stringify(post, null, 2));
        return;
      }
      default:
        throw new Error(`Unknown command "${command}"`);
    }
  } finally {
    await shutdown();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
