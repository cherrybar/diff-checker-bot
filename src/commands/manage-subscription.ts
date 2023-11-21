import { Button, ChatState, IMessageActionPayload } from '../types';
import User from '../models/user';

export async function manageSubscription({ chatId, bot }: IMessageActionPayload) {
	const user = await User.findById(chatId);

	if (!user) {
		return;
	}

	const statusText = user.isSubscribed ? 'Ты подписан на ежедневные обновления.' : 'Ты не подписан на ежедневные обновления.';
	const actionText = user.isSubscribed ? 'Отписаться' : 'Подписаться';

	await bot.sendMessage(chatId, statusText, {
		reply_markup: {
			inline_keyboard: [[{ text: actionText, callback_data: Button.ToggleSubscription }]],
		},
	});
}

export async function toggleSubscription({ bot, chatId }: IMessageActionPayload) {
	const user = await User.findById(chatId);
	if (!user) {
		return;
	}

	await user.updateOne({ state: ChatState.Default, isSubscribed: !user.isSubscribed });
	const msg = user.isSubscribed ? '✅ Ты отписался от ежедневных обновлений' : '🎉 Теперь по будням в 11 утра тебе будет приходить письмо с обновлениями';
	await bot.sendMessage(chatId, msg);
}
