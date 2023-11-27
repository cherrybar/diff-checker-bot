import { Button, ChatState, IDbUser, IMessageActionPayload } from '../types';
import TelegramBot from 'node-telegram-bot-api';
import { HydratedDocument } from 'mongoose';
import User from '../models/user';

export async function updateExcludedProjects({ chatId, bot }: IMessageActionPayload) {
	const user = await User.findById(chatId);

	const info = user && user.excludedProjects.length ? `Текущий список проектов исключений: <i>${user.excludedProjects}</i>.\n` : '';
	const text = 'Укажи через запятую ключи проектов, mr которых нужно исключать при поиске. Например:\nCTSMM, PCRD\n';

	await bot.sendMessage(chatId, `ℹ️ ${info}${text}`, {
		reply_markup: {
			inline_keyboard: [
				[
					{ text: 'Отмена', callback_data: Button.Cancel },
					{ text: 'Очистить список', callback_data: Button.ClearList },
				],
			],
		},
		parse_mode: 'HTML',
	});

	if (!user) {
		return;
	}
	await user.updateOne({ state: ChatState.WaitingForExcludedProjects });
}

export async function clearExcludedProjectsList({ chatId, bot }: IMessageActionPayload) {
	const user = await User.findById(chatId);
	if (!user) {
		return;
	}
	await user.updateOne({ state: ChatState.Default, excludedProjects: '' });
	await bot.sendMessage(chatId, '✅ Список проектов обновлен');
}

export async function updateExcludedProjectsResponseHandler({ text, bot, chatId, user }: { text: string; bot: TelegramBot; chatId: number; user: HydratedDocument<IDbUser> }) {
	await user.updateOne({ state: ChatState.Default, excludedProjects: text });
	await bot.sendMessage(chatId, '✅ Список проектов обновлен');
}
