import { ChannelType, Message } from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';
import { CONFIG } from '../../config';

const openAI = new OpenAIApi(new Configuration({
  apiKey: CONFIG.openai.key,
}));

export async function gptHandler(message: Message): Promise<void> {
  if (message.channel.type !== ChannelType.GuildText) {
    return;
  }

  if (message.author.bot) {
    return;
  }

  // TODO: validate channel

  // eslint-disable-next-line no-unreachable
  const context = (
    'You are a Dank Memer Support Bot. You will be presented with question and answers in this format: {"prompt": "", "completion": ""} with prompt being the question and completion being the answer. ' +
    'Do not include the prompt in the final answer. Do not give the answer in json format. Answer only if the question is in the scope of provided questions prompts (dank memer related). If it is not, only say that you can\'t help.\n\n' +
    JSON.stringify([
      {
        'prompt': 'How do I change back to the pls prefix?!',
        'completion': 'You can not change the prefix of the bot, we now use / commands and there is no way to change our prefix.',
      },
      {
        'prompt': 'How do I share items with my friends now????',
        'completion': 'You can use the /market command for strangers and /friends share command for people you do know. ',
      },
      {
        'prompt': 'How do I set up Dank Memer in my server?',
        'completion': 'You can find a detaile tutorial on how to do so here https://dankmemer.lol/tutorial/set-up-dank-memer',
      },
      {
        'prompt': 'How can I farm?',
        'completion': 'There is a detailed farm guide here https://dankmemer.lol/tutorial/farming',
      },
      {
        'prompt': 'Isn’t “this” against the rules?!',
        'completion': 'You can find the rules back here https://dankmemer.lol/rules , everything that is not allowed is listed here, if it’s not listed there it is allowed.',
      },
      {
        'prompt': 'How do I partially accept market offers?',
        'completion': 'There is a detailed guide on how to do so here https://dankmemer.lol/tutorial/partials',
      },
      {
        'prompt': 'I just bought the “Customize my profile” upgrade but it’s not changing, how can I change this??',
        'completion': 'When you type /settings, you can look for the “Customize your profile” option in the dropdown menu and change it there.',
      },
      {
        'prompt': 'I have worms/moles in my farm, how do I get rid of them?!',
        'completion': 'You can just harvest them the way you harvest crops.',
      },
      {
        'prompt': 'I lost a lot of cash/items but I didn’t get any notification?!',
        'completion': 'Make sure to check your /currencylog & /notifications list and try to find back when and where you lost the cash/items, it’ll tell you there what command caused it.',
      },
      {
        'prompt': 'I didn’t get a reply to my appeal, what do I do?',
        'completion': 'If it’s been over 2 weeks and you didn’t get a reply, you can be sure it was denied and you’ll have to wait out the time.',
      },
      {
        'prompt': 'Are alts/holders allowed???',
        'completion': 'Make sure to read our rule 10 good here https://dankmemer.lol/rules , everything that is not allowed regarding alts is listed there, if it’s not listed, it’s allowed.',
      },
      {
        'prompt': 'I just got scammed, can I report them here???',
        'completion': 'We do not take reports here, feel free to use the /report command and report them for scamming there, you’ll need their ID + provide strict proof for it though. If you want to add multiple pictures, go to https://imgur.com and upload the pictures there and then provide the link to your imgur post in the report.',
      },
      {
        'prompt': 'I purchased the $x subscription but then upgraded to a higher tier but did not get my new reward instantly, what do I do?',
        'completion': 'Check /donor status, it’ll tell you when you get your next rewards. If you were previously already subscribed, your next reward will still be received on the same day as before, you won’t get them instantly.',
      },
      {
        'prompt': 'I bought more pets from the /advancements upgrades command and it still says I can\'t buy another pet because I don\'t have enough slots, what do I do?',
        'completion': 'Make sure all your pets are level 30 or higher, even if you bought an extra slot, all your previous pets have to be level 30+ in order to unlock a new available slot.',
      },
      {
        'prompt': 'I used an item but now I don’t have it active anymore, what happened?!',
        'completion': 'Check your /currencylog and /notifications list to see if you died recently without a lifesaver, when you die, all your active items get removed.',
      },
      {
        'prompt': 'The bot won’t let anyone except admins use the bot, what do I do?',
        'completion': 'This Discord guide (https://support.discord.com/hc/en-us/articles/4644915651095-Command-Permissions ) will explain how to set up the permissions for specific roles/limit command usage to specific roles/disable the use of specific commands/restrict the usage of the bot and it’s commands to specific channels.',
      },
      {
        'prompt': 'How do I restrict the bot to only work in one/certain channel(s)?',
        'completion': 'This Discord guide (https://support.discord.com/hc/en-us/articles/4644915651095-Command-Permissions ) will explain how to set up the permissions for specific roles/limit command usage to specific roles/disable the use of specific commands/restrict the usage of the bot and it’s commands to specific channels.',
      },
      {
        'prompt': 'The emojis are bugging in my commands, how can I fix this?!',
        'completion': 'If you\'re having an issue with emotes not appearing properly on /adventure, this is because interaction responses have the permissions of the @​everyone role for that channel or server (it\'ll respect role permissions if the channel doesn\'t have anything disabled/enabled for @​everyone).\nSo, if @​everyone doesn\'t have the custom emojis permission, that\'ll happen, to fix it: simply give @​everyone external emote permissions in that specified channel or within the role\'s permissions.',
      },
      {
        'prompt': 'I no longer have access to my account (due to 2FA lock or a ban), can I transfer my data?',
        'completion': 'No, it is not possible to transfer any account data at all.',
      },
      {
        'prompt': 'I used the /work command and when I clicked the button it said “Something went wrong\nIf this issue persists longer than a few minutes, report it in our support server here”',
        'completion': 'This is most likely caused due to a discord delay/lagg, just try to wait until the embed updates and then click a button. Try again next time and see if it happens again, but usually this is only a once in a while thing that happens.',
      },
    ])
  );

  const completion = await openAI.createChatCompletion({
    model: 'gpt-3.5-turbo',
    max_tokens: 200,
    frequency_penalty: 0,
    presence_penalty: 0,
    messages: [
      { role: 'system', content: context },
      { role: 'user', content: message.content },
    ],
  });

  message.channel.send(completion.data.choices[0].message);
}
