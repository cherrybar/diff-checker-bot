import { Button, ChatState, IMessageActionPayload } from '../types';
import User from '../models/user';

export async function manageSubscription({ chatId, bot }: IMessageActionPayload) {
	const user = await User.findById(chatId);

	if (!user) {
		return;
	}

	const statusText = user.isSubscribed ? 'Ты подписан на ежедневные обновления.' : 'Ты не подписан на ежедневные обновления.';
	const actionText = user.isSubscribed ? 'Для отписки напиши "отписаться"' : 'Для подписки напиши "подписаться"';

	await bot.sendMessage(chatId, `${statusText} ${actionText}`, {
		reply_markup: {
			inline_keyboard: [[{ text: 'Отмена', callback_data: Button.Cancel }]],
		},
	});

	await user.updateOne({ state: ChatState.WaitingForSubscriptionToggle });
}

export async function manageSubscriptionResponseHandler({ text, bot, chatId, user }: { text: string; bot: any; chatId: number; user: any }) {
	const needToggle = (text.toLowerCase() === 'подписаться' && !user.isSubscribed) || (text.toLowerCase() === 'отписаться' && user.isSubscribed);
	await user.updateOne({ state: ChatState.Default, isSubscribed: needToggle ? !user.isSubscribed : user.isSubscribed });

	if (needToggle) {
		const msg = user.isSubscribed ? '✅ Ты отписался от ежедневных обновлений' : '🎉 Теперь по будням в 11 утра тебе будет приходить письмо с обновлениями';
		await bot.sendMessage(chatId, msg);
	}
}
