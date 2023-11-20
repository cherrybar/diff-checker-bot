import TelegramBot from 'node-telegram-bot-api';
import mongoose, { HydratedDocument } from 'mongoose';
import * as process from 'process';
import { Button, ChatState, IMessageActionPayload } from './types';
import User from './models/user';
import { addToWatching, addToWatchingResponseHandler, removeFromWatching, showList, runCheck, updateUsername, updateUsernameResponseHandler } from './commands';
import { IDbUser } from './types';
import { removeFromWatchingResponseHandler } from './commands/remove-from-watching';

const botToken = process.env.TG_BOT_TOKEN as string;
const mongodbURI = process.env.MONGODB_URI as string;

const bot = new TelegramBot(botToken, { polling: true });
mongoose.connect(mongodbURI);

const actionByChosenButton: Record<Button, (data: IMessageActionPayload) => void> = {
	[Button.AddToWatching]: addToWatching,
	[Button.RemoveFromWatching]: removeFromWatching,
	[Button.ShowWatching]: showList,
	[Button.Check]: runCheck,
	[Button.UpdateUsername]: updateUsername,
};

async function handleButtonClick(data: IMessageActionPayload, action: Button) {
	const user = await User.findById(data.msg.chat.id);
	if (!user || !user.gitlabUsername) {
		updateUsername(data);
		return;
	}
	actionByChosenButton[action](data);
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
			],
		},
	});
}

async function handleUserResponse(user: HydratedDocument<IDbUser>, msg: TelegramBot.Message) {
	const text = msg.text || '';
	const chatId = msg.chat.id;

	switch (user.state) {
		case ChatState.UsernameValidation:
			updateUsernameResponseHandler({ user, username: text, bot, chatId, callback: sendChooseActionMsg });
			break;

		case ChatState.WaitingForDataToAdd:
			addToWatchingResponseHandler({ user, text, bot, chatId });
			break;

		case ChatState.WaitingForDataToRemove:
			removeFromWatchingResponseHandler({ user, text, bot, chatId });
			break;

		default:
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

		handleButtonClick({ msg: callbackQuery.message, bot }, action);
		bot.answerCallbackQuery(callbackQuery.id);
	});

	bot.on('message', async msg => {
		const text = msg.text;

		if (text === 'del') {
			await User.deleteMany({});
			const users = await User.find();
			console.log({ users });
		}

		if (!text) {
			return;
		}

		const chatId = msg.chat.id;

		if (text === '/start') {
			await bot.sendMessage(chatId, 'Привет!');
			updateUsername({ msg, bot });
			return;
		}

		if (isPredefinedButton(text)) {
			handleButtonClick({ msg, bot }, text);
			return;
		}

		const user = await User.findById(chatId);
		if (user) {
			handleUserResponse(user, msg);
		} else {
			updateUsername({ msg, bot });
		}
	});
}

main();
