import { Button, ChatState, IDbUser, IMessageActionPayload } from '../types';
import User from '../models/user';
import TelegramBot from 'node-telegram-bot-api';
import { HydratedDocument } from 'mongoose';

export async function updateUsername({ chatId, bot }: IMessageActionPayload) {
	const user = await User.findById(chatId);

	const replyOptions = user?.gitlabUsername
		? {
				reply_markup: {
					inline_keyboard: [[{ text: 'Отмена', callback_data: Button.Cancel }]],
				},
		  }
		: {};
	await bot.sendMessage(chatId, 'ℹ️ Укажи свой username в gitlab', replyOptions);

	if (user) {
		await user.updateOne({ state: ChatState.UsernameValidation });
	} else {
		const newUser = new User({ _id: chatId, telegramId: chatId, state: ChatState.UsernameValidation, excludedProjects: '', isSubscribed: false });
		await newUser.save();
	}
}

export async function updateUsernameResponseHandler({ text, bot, chatId, user }: { text: string; bot: TelegramBot; chatId: number; user: HydratedDocument<IDbUser> }) {
	if (!text.match(/^[a-zA-Z0-9_.-]*$/)) {
		await user.updateOne({ state: ChatState.Default });
		bot.sendMessage(chatId, '⛔️ Введен некорректный username');
		return;
	}
	await user.updateOne({ state: ChatState.Default, gitlabUsername: text });
	await bot.sendMessage(chatId, `✅ Username ${text} сохранен`);
	return;
}
