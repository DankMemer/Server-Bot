import { CONFIG } from '../../config';

type Option = {
  name: string;
  description: string;
  response?: string;
  role?: string;
};

export const HELP_DESK_OPTIONS: Option[] = [
  {
    name: 'Premium user Questions',
    description: 'Select this if you have issues or questions about Premium.',
    response: 
      'If you are unsure on how to redeem your premium perks, we suggest reading the following tutorial on our website: https://dankmemer.lol/tutorial/premium-redemption \n\n'+
      'You can also check out the Frequently Asked Questions on our website: https://dankmemer.lol/faq \n\n'+
      'If you still have questions, click on the dropdown menu again and select the `Other` option.', // TODO
  },
  {
    name: 'Bot Bans',
    description: 'Select this if you have issues with a bot ban and don\'t know what to do next.',
    response:
      'If you have been banned, run any normal bot command to get the appear message available to write your appeal. Be aware that you can only appeal twice per bot ban, so be sure to write a good one.\n\n' +
      'All appeals are read within 2 weeks. Dank Memer will DM you if your appeal has been accepted or rejected.\n\n' +
      ':warning: Moderators and other people cannot see this type of data on the bot and they can\'t tell you why you were banned. It\'s more than likely that you broke one of the rules listed at: https://dankmemer.lol/rules',
  },
  {
    name: 'Server Bans',
    description: 'Select this if you have issues with a server ban and don\'t know what to do next .',
    response: 
      'If you have been banned from DMC, go back to the helpdesk channel and select DMC Appeal from the drop down menu. Be aware that there is a 2 week cooldown between sending appeals, so be sure to write a good one\n\n'+
      'All appeals are read within 2 weeks. Community Bot will DM you if your appeal has been accepted or rejected.\n\n',
  },
  {
    name: 'Non-issue related Dank Memer Questions',
    description: 'Question that isn\'t really an issue (what does X do? How does Y work?)',
    response:
      '**The support server is not meant for these types of questions.**\n\n' +
      'Due to the mass influx of these types of questions, we employ an attitude of “Try it and see”. Our support channel is for advanced issues, bugs etc.\n\n'+
      'If you aren\'t sure on what to do, feel free to ask around the Community server or the subreddit: https://www.reddit.com/r/dankmemer/.',
  },
  {
    name: 'Bugs',
    description: 'If you think you\'ve found or are experiencing a bug.',
    response:
      'First, make sure whatever "bug" you are experiencing isn\'t an intended change posted in the last few messages of bot-news. Also, check our latest blog posts (https://dankmemer.lol/community/blogs) and recent changelogs (https://dankmemer.lol/changelog) to see if it\'s a change you\'ve missed. These three resources contain all of our update notes and will mention any known issues we are working on fixing. \n\n' +
      'If it is not mentioned in any of these places, you can report the bug in the <#966355561878790194> channel following the instructions posted there, or if you want to confirm it\'s a bug, go back to the help-desk channel and select the last option to speak with a support staff member first.', // TODO: use config id
  },
  {
    name: 'Dank Memer Community Questions',
    description: 'Questions about Dank Memer Community.',
    response:
      '**This server is for Dank Memer BOT SUPPORT. We do not answer questions about the community server.**\n\n' +
      'If you have questions about that server, ask the moderation staff in that server.\n\n' +
      'If you are trying to appeal a server ban, use the DMC Appeal button from the dropdown menu.',
  },
  {
    name: 'Bot Reports',
    description: 'If you want to report someone for breaking the Bot Rules.',
    response:
      'To report someone for breaking our rules, please run the /report command on the user in question.\n\n' +
      'Be sure to check which rules they are breaking (you can find more information about the rules here: https://dankmemer.lol/rules \n\n' +
      'Additionally, provide proof if you are able. You can use imgur or any other image hosting website to attach the proof.\n\n' +
      ':warning: Only Bot Admins can read your reports and they will reach out to you regarding it in case more information is needed. Additionally, you will not know if action was taken.',
  },
  {
    name: 'Bot Updates Role',
    description: 'Get yourself the bot updates ping role that gets used sometimes.',
    response:
      'You have been given the bot updates role and will get notified if it is pinged by developers.',
      role: '529468286392336394' // todo: config this
  },
  {
    name: 'Get update messages in your server',
    description: 'Get update notes in your server.',
    response:
      'Our channel, <#599044275291947016> , is an announcement channel. There is a follow button on the channel when you visit it.\n\n' + // TODO: config channel
      'To learn more, please visit this Discord article: https://support.discord.com/hc/en-us/articles/360028384531-Channel-Following-FAQ',
  },
  {
    name: 'Other',
    description: 'If you have a general inquiry that isn\'t answered here.',
    response: 'You have been granted the Support role. This gives you access to the <#491466924799164426> channel.',
    role: CONFIG.ids.roles.dmo.support,
  },
  {
    name: 'DMC Appeal',
    description: 'Appeal a DMC ban.',
  },
];