import TelegramBot from 'node-telegram-bot-api';
import mongoose, { HydratedDocument } from 'mongoose';
import * as process from 'process';
import schedule from 'node-schedule';
import { Button, ChatState, IMessageActionPayload, IMessageResponseHandlerPayload, IDbUser } from './types';
import User from './models/user';
import {
	addToWatching,
	addToWatchingResponseHandler,
	removeFromWatching,
	showList,
	runManualCheck,
	runAutoCheck,
	updateUsername,
	updateUsernameResponseHandler,
	cancelCommand,
	removeFromWatchingResponseHandler,
	clearExcludedProjectsList,
	updateExcludedProjects,
	updateExcludedProjectsResponseHandler,
	manageSubscription,
	toggleSubscription,
} from './commands';

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
	[Button.ToggleSubscription]: toggleSubscription,
};

const responseHandlerByState: Partial<Record<ChatState, (data: IMessageResponseHandlerPayload) => void>> = {
	[ChatState.WaitingForDataToAdd]: addToWatchingResponseHandler,
	[ChatState.WaitingForDataToRemove]: removeFromWatchingResponseHandler,
	[ChatState.UsernameValidation]: updateUsernameResponseHandler,
	[ChatState.WaitingForExcludedProjects]: updateExcludedProjectsResponseHandler,
};

const buttons: { title: string; value: Button }[] = [
	{ title: 'Запустить проверку', value: Button.Check },
	{ title: 'Добавить файлы для наблюдения', value: Button.AddToWatching },
	{ title: 'Удалить файлы из наблюдаемых', value: Button.RemoveFromWatching },
	{ title: 'Показать список наблюдаемых файлов', value: Button.ShowWatching },
	{ title: 'Изменить username', value: Button.UpdateUsername },
	{ title: 'Изменить список проектов-исключений', value: Button.ExcludedProject },
	{ title: 'Управлять подпиской на обновления', value: Button.ManageSubscription },
];

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
			inline_keyboard: buttons.map(action => [{ text: action.title, callback_data: action.value }]),
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
	const commands = buttons.map(action => ({ command: action.value, description: action.title }));

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

schedule.scheduleJob({ rule: process.env.SCHEDULER_RULE, tz: 'Europe/Moscow' }, async () => {
	const allUsers = await User.find({ isSubscribed: true, $where: 'this.watchingPaths.length > 0' });

	runAutoCheck(
		bot,
		allUsers.map(user => user.telegramId),
	);
});

main();
