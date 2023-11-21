import TelegramBot from 'node-telegram-bot-api';
import mongoose, { HydratedDocument } from 'mongoose';
import * as process from 'process';
import schedule from 'node-schedule';
import { Button, ChatState, IMessageActionPayload, IMessageResponseHandlerPayload } from './types';
import User from './models/user';
import {
	addToWatching,
	addToWatchingResponseHandler,
	removeFromWatching,
	showList,
	runManualCheck,
	updateUsername,
	updateUsernameResponseHandler,
	cancelCommand,
} from './commands';
import { IDbUser } from './types';
import { removeFromWatchingResponseHandler } from './commands/remove-from-watching';
import { clearExcludedProjectsList, updateExcludedProjects, updateExcludedProjectsResponseHandler } from './commands/update-excluded-projects';
import { manageSubscription, manageSubscriptionResponseHandler } from './commands/manage-subscription';
import { runAutoCheck } from './commands/run-check';

const botToken = process.env.TG_BOT_TOKEN as string;
const mongodbURI = process.env.MONGODB_URI as string;

const bot = new TelegramBot(botToken, { polling: true });
mongoose.connect(mongodbURI);

const actionByChosenButton: Partial<Record<Button, (data: IMessageActionPayload) => void>> = {
	[Button.AddToWatching]: addToWatching,
	[Button.RemoveFromWatching]: removeFromWatching,
	[Button.ShowWatching]: showList,
	[Button.Check]: runManualCheck,
	[Button.UpdateUsername]: updateUsername,
	[Button.Cancel]: cancelCommand,
	[Button.ExcludedProject]: updateExcludedProjects,
	[Button.ClearList]: clearExcludedProjectsList,
	[Button.ManageSubscription]: manageSubscription,
};

const responseHandlerByState: Partial<Record<ChatState, (data: IMessageResponseHandlerPayload) => void>> = {
	[ChatState.WaitingForDataToAdd]: addToWatchingResponseHandler,
	[ChatState.WaitingForDataToRemove]: removeFromWatchingResponseHandler,
	[ChatState.UsernameValidation]: updateUsernameResponseHandler,
	[ChatState.WaitingForExcludedProjects]: updateExcludedProjectsResponseHandler,
	[ChatState.WaitingForSubscriptionToggle]: manageSubscriptionResponseHandler,
};

async function handleButtonClick(data: IMessageActionPayload, action: Button) {
	const user = await User.findById(data.chatId);
	if (!user || !user.gitlabUsername) {
		updateUsername(data);
		return;
	}

	const actionHandler = actionByChosenButton[action];
	if (actionHandler) {
		actionHandler(data);
	}
}

function isPredefinedButton(value: any): value is Button {
	return Object.values(Button).includes(value);
}

async function sendChooseActionMsg(chatId: number, bot: TelegramBot) {
	await bot.sendMessage(chatId, 'Выбери команду из списка ниже', {
		reply_markup: {
			inline_keyboard: [
				[{ text: 'Запустить проверку', callback_data: Button.Check }],
				[{ text: 'Добавить файлы для наблюдения', callback_data: Button.AddToWatching }],
				[{ text: 'Удалить файлы из наблюдаемых', callback_data: Button.RemoveFromWatching }],
				[{ text: 'Показать список наблюдаемых файлов', callback_data: Button.ShowWatching }],
				[{ text: 'Изменить username', callback_data: Button.UpdateUsername }],
				[{ text: 'Изменить список проектов-исключений', callback_data: Button.ExcludedProject }],
				[{ text: 'Управлять подпиской на обновления', callback_data: Button.ManageSubscription }],
			],
		},
	});
}

async function handleUserResponse(user: HydratedDocument<IDbUser>, msg: TelegramBot.Message) {
	const text = msg.text || '';
	const chatId = msg.chat.id;

	const responseHandler = responseHandlerByState[user.state];

	if (responseHandler) {
		responseHandler({ user, text, bot, chatId });
	} else {
		sendChooseActionMsg(chatId, bot);
	}
}

async function main() {
	const commands = [
		{ command: Button.Check, description: 'Запустить проверку' },
		{ command: Button.AddToWatching, description: 'Добавить файлы для наблюдения' },
		{ command: Button.RemoveFromWatching, description: 'Удалить файлы из наблюдаемых' },
		{ command: Button.ShowWatching, description: 'Показать список наблюдаемых файлов' },
		{ command: Button.UpdateUsername, description: 'Изменить username' },
		{ command: Button.ExcludedProject, description: 'Изменить список проектов-исключений' },
		{ command: Button.ManageSubscription, description: 'Управлять подпиской на обновления' },
	];

	bot.setMyCommands(commands);

	bot.on('callback_query', async callbackQuery => {
		if (!callbackQuery.message) {
			return;
		}

		const action = callbackQuery.data;

		if (!isPredefinedButton(action)) {
			console.log(`No action for the button ${action} was specified`);
			return;
		}

		handleButtonClick({ chatId: callbackQuery.message.chat.id, bot }, action);
		bot.answerCallbackQuery(callbackQuery.id);
	});

	bot.on('message', async msg => {
		const text = msg.text;

		if (!text) {
			return;
		}

		const chatId = msg.chat.id;

		if (text === '/start') {
			await bot.sendMessage(chatId, 'Привет!👋');
			const user = await User.findById(chatId);
			if (!user) {
				updateUsername({ chatId, bot });
			} else {
				sendChooseActionMsg(chatId, bot);
			}
			return;
		}

		if (isPredefinedButton(text)) {
			handleButtonClick({ chatId, bot }, text);
			return;
		}

		const user = await User.findById(chatId);

		if (user) {
			handleUserResponse(user, msg);
		} else {
			updateUsername({ chatId, bot });
		}
	});
}

async function sendUpdates() {
	const allUsers = await User.find({ isSubscribed: true, $where: 'this.watchingPaths.length > 0' });

	runAutoCheck(
		bot,
		allUsers.map(user => user.telegramId),
	);
}

schedule.scheduleJob({ rule: process.env.SCHEDULER_RULE, tz: 'Europe/Moscow' }, function () {
	sendUpdates();
});

main();
