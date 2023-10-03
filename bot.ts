import { Bot, Context, session, SessionFlavor } from "./deps.deno.ts";
import { freeStorage } from "https://deno.land/x/grammy_storages@v2.3.2/free/src/mod.ts";
import { parseFeed } from "https://deno.land/x/rss/mod.ts";
let response = await fetch(
    "http://stadt-bremerhaven.de/feed",
);
let xml = await response.text();
let feed = await parseFeed(xml);

//Local Deno Deploy DB
const kv = await Deno.openKv();

// Define the session structure.
interface SessionData {
    date: number;
    // deno-lint-ignore no-explicit-any
    latestItem: any;
}
type MyContext = Context & SessionFlavor<SessionData>;

// Create the bot and register the session middleware.

export const bot = new Bot<MyContext>(Deno.env.get("BOT_TOKEN") || "");

bot.use(session({
    initial: () => ({ date: 0, latestItem: null }),
    storage: freeStorage<SessionData>(bot.token),
}));

bot.command("start", async (ctx) => {
    await ctx.reply("***" + feed.entries[0].title.value + "***" + "\n\n" + feed.entries[0].links[0].href, {parse_mode: "Markdown"})
});


// Define a variable to store the latest item
let latestItem = await kv.get(["links"]);

// Define a function to check for new items
async function checkForNewItems() {
    // Parse the RSS feed
    const response = await fetch(
        "http://stadt-bremerhaven.de/feed",
    );
    const xml = await response.text();
    const feed = await parseFeed(xml);

    await bot.api.sendMessage(58310247 ,"Check done", {parse_mode: "Markdown"});
    // Get the latest item
    const currentItem = feed.entries[0];
    // Compare with the previous item
    if (currentItem.links[0].href !== (latestItem as { value: { links: { href: string }[] } })?.value?.links[0].href) {
        // Run your function here
        console.log('New item detected:', currentItem.title.value);
        console.log('New link:', currentItem.links[0].href);
        console.log('Old link:', (latestItem as { value: { links: { href: string }[] } }).value.links[0].href);
        await bot.api.sendMessage(58310247 ,"***" + currentItem.title.value + "***" + "\n\n" + currentItem.links[0].href, {parse_mode: "Markdown"});
        // Update the latest item
        await kv.set(["links"], currentItem);
        latestItem.value = currentItem;
    }
}

bot.command("ping", (ctx) => ctx.reply(`Pong! ${new Date()} ${Date.now()}`));

// Call the function periodically
setInterval(() => checkForNewItems(), 60000); // Check every minute

bot.command("ping", (ctx) => ctx.reply(`Pong! ${new Date()} ${Date.now()}`));
