import TelegramBot from 'node-telegram-bot-api';
import { HydratedDocument } from 'mongoose';

export enum Button {
	AddToWatching = '/add',
	RemoveFromWatching = '/remove',
	ShowWatching = '/show',
	Check = '/check',
	UpdateUsername = '/update_username',
	ExcludedProject = '/exclude_projects',
	Cancel = '/cancel',
	ClearList = '/clear_list',
	ManageSubscription = '/manage_subscribe',
}

export enum ChatState {
	Default = 'default',
	UsernameValidation = 'username_validation',
	WaitingForDataToAdd = 'waiting_for_add',
	WaitingForDataToRemove = 'waiting_for_remove',
	WaitingForExcludedProjects = 'waiting_for_excluded_projects',
	WaitingForSubscriptionToggle = 'waiting_for_subscription_toggle',
}

export interface IMergeRequest {
	id: number;
	iid: number;
	project_id: number;
	title: string;
	description: string;
	state: string;
	merge_user: IGitlabUser;
	merged_at: string;
	prepared_at: string;
	closed_by: IGitlabUser | null;
	closed_at: string | null;
	created_at: string;
	updated_at: string;
	target_branch: string;
	source_branch: string;
	upvotes: number;
	downvotes: number;
	author: IGitlabUser;
	assignee: IGitlabUser;
	assignees: IGitlabUser[];
	reviewers: IGitlabUser[];
	source_project_id: number;
	target_project_id: number;
	labels: string[];
	draft: boolean;
	work_in_progress: boolean;
	milestone: {
		id: number;
		iid: number;
		project_id: number;
		title: string;
		description: string;
		state: string;
		created_at: string;
		updated_at: string;
		due_date: string;
		start_date: string;
		web_url: string;
	};
	merge_when_pipeline_succeeds: boolean;
	merge_status: string; // deprecated
	detailed_merge_status: MergeRequestStatus;
	merge_error?: unknown; // есть в /merge
	sha: string;
	merge_commit_sha: string | null;
	squash_commit_sha: string | null;
	user_notes_count: number;
	discussion_locked: boolean | null;
	should_remove_source_branch: boolean;
	force_remove_source_branch: boolean;
	allow_collaboration: boolean;
	allow_maintainer_to_push: boolean;
	web_url: string;
	references: {
		short: string;
		relative: string;
		full: string;
	};
	time_stats: {
		time_estimate: number;
		total_time_spent: number;
		human_time_estimate: string | null;
		human_total_time_spent: string | null;
	};
	squash: boolean;
	task_completion_status: {
		count: number;
		completed_count: number;
	};
	has_conflicts: boolean;
	blocking_discussions_resolved: boolean;
}

export const enum MergeRequestStatus {
	Blocked = 'blocked_status', // Blocked by another merge request
	Broken = 'broken_status', // Can’t merge into the target branch due to a potential conflict.
	Checking = 'checking', // Git is testing if a valid merge is possible.
	Unchecked = 'unchecked', // Git has not yet tested if a valid merge is possible.
	CiMustPass = 'ci_must_pass', // A CI/CD pipeline must succeed before merge.
	CiStillRunning = 'ci_still_running', // A CI/CD pipeline is still running.
	DiscussionsNotResolved = 'discussions_not_resolved', // All discussions must be resolved before merge.
	DraftStatus = 'draft_status', // Can’t merge because the merge request is a draft.
	ExternalStatusChecks = 'external_status_checks', // All status checks must pass before merge.
	Mergeable = 'mergeable', // The branch can merge cleanly into the target branch.
	NotApproved = 'not_approved', // Approval is required before merge.
	NotOpen = 'not_open', // The merge request must be open before merge.
	PoliciesDenied = 'policies_denied', // The merge request contains denied policies.
}

export interface IGitlabUser {
	id: number;
	name: string;
	username: string;
	state: string;
	avatar_url: string | null;
	web_url: string;
}

export interface IMergeRequestDiff {
	old_path: string;
	new_path: string;
	a_mode: string;
	b_mode: string;
	diff: string;
	new_file: boolean;
	renamed_file: boolean;
	deleted_file: boolean;
}

export interface IMergeRequestWithDiffs {
	iid: number;
	diff: IMergeRequestDiff[];
}

export interface IMessageActionPayload {
	chatId: number;
	bot: TelegramBot;
}

export interface IMessageResponseHandlerPayload {
	text: string;
	chatId: number;
	bot: TelegramBot;
	user: HydratedDocument<IDbUser>;
}

export interface IDbUser {
	_id: string;
	telegramId: number;
	gitlabUsername?: string;
	watchingPaths: string[];
	state: ChatState;
	excludedProjects: string;
	isSubscribed: boolean;
}
