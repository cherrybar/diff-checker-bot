import { ChatState, IDbUser, IMessageActionPayload } from '../types';
import User from '../models/user';
import TelegramBot from 'node-telegram-bot-api';
import { HydratedDocument } from 'mongoose';

export async function updateUsername({ msg, bot }: IMessageActionPayload) {
	const chatId = msg.chat.id;
	await bot.sendMessage(chatId, 'ℹ️ Укажи свой username в gitlab');
	console.log(await User.find());
	const user = await User.findById(chatId);

	if (user) {
		await user.updateOne({ state: ChatState.UsernameValidation });
	} else {
		const newUser = new User({ _id: chatId, telegramId: chatId, state: ChatState.UsernameValidation });
		await newUser.save();
	}
}

export async function updateUsernameResponseHandler({
	username,
	bot,
	chatId,
	user,
	callback,
}: {
	username: string;
	bot: TelegramBot;
	chatId: number;
	user: HydratedDocument<IDbUser>;
	callback: (chatId: number, bot: TelegramBot) => void;
}) {
	if (!username.match(/^[a-zA-Z0-9_.-]*$/)) {
		bot.sendMessage(chatId, '⛔️ Введен некорректный username');
		return;
	}
	await user.updateOne({ state: ChatState.Default, gitlabUsername: username });
	await bot.sendMessage(chatId, `✅ Username ${username} сохранен`);
	callback(chatId, bot);
	return;
}
