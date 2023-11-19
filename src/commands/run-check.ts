import { IMessageActionPayload } from '../types';

export async function runCheck({ msg, bot }: IMessageActionPayload) {
	await bot.sendMessage(msg.chat.id, 'Запускаем проверку...');
}
