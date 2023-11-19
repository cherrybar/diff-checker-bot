import TelegramBot from 'node-telegram-bot-api';
import * as process from 'process';
import { Button, IMessageActionPayload } from './types';
const bot = new TelegramBot(process.env.TG_BOT_TOKEN as string, { polling: true });
import addToWatching from './commands/add-to-watching';
import removeFromWatching from './commands/remove-from-watching';
import showList from './commands/show-list';
import runCheck from './commands/run-check';

const actionByChosenButton: Record<Button, (data: IMessageActionPayload) => void> = {
	[Button.AddToWatching]: addToWatching,
	[Button.RemoveFromWatching]: removeFromWatching,
	[Button.ShowWatching]: showList,
	[Button.Check]: runCheck,
};

function isValidButton(value: any): value is Button {
	return Object.values(Button).includes(value);
}

async function main() {
	bot.setMyCommands([
		{ command: '/run', description: 'Запустить проверку' },
		{ command: '/add', description: 'Добавить файлы для наблюдения' },
		{ command: '/remove', description: 'Удалить файлы из наблюдаемых' },
		{ command: '/show', description: 'Показать список наблюдаемых файлов' },
	]);

	bot.onText(/\/start/, msg => {
		bot.sendMessage(msg.chat.id, 'Привет! Выбери команду из списка ниже', {
			reply_markup: {
				inline_keyboard: [
					[{ text: 'Запустить проверку', callback_data: Button.Check }],
					[{ text: 'Добавить файлы для наблюдения', callback_data: Button.AddToWatching }],
					[{ text: 'Удалить файлы из наблюдаемых', callback_data: Button.RemoveFromWatching }],
					[{ text: 'Показать список наблюдаемых файлов', callback_data: Button.ShowWatching }],
				],
			},
		});
	});

	bot.on('callback_query', async callbackQuery => {
		if (!callbackQuery.message) {
			return;
		}
		const action = callbackQuery.data;

		if (!isValidButton(action)) {
			console.log(`No action for the button ${action} was specified`);
			return;
		}

		const chatId = callbackQuery.message.chat.id;

		actionByChosenButton[action]({ chatId, message: callbackQuery.message, bot });
		bot.answerCallbackQuery(callbackQuery.id);
	});
}

main();
