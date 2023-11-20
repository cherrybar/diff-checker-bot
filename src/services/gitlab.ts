import { IMergeRequest, IMergeRequestDiff, IMergeRequestWithDiffs } from '../types';

const projectId = process.env.PROJECT_ID;
const GITLAB_BASE_URL = `${process.env.GITLAB_API_URL}/projects/${projectId}`;

function getDefaultGitlabHeaders() {
	return {
		'Accept': 'application/json',
		'Authorization': 'Bearer ' + process.env.GITLAB_API_ACCESS_TOKEN,
		'Content-Type': 'application/json',
	};
}

function buildQueryString(params: Record<string, string>): string {
	const pairs = Object.entries(params).map(([key, value]) => `${key}=${value}`);
	return pairs.length > 0 ? '?' + pairs.join('&') : '';
}

async function handleResponse<T>(res: Response): Promise<T | null> {
	if (res.status === 204) {
		return null;
	}

	if (res.status === 401) {
		console.log('401 Unauthorized');
		return null;
	}

	try {
		return await res.json();
	} catch (error) {
		console.log('Error parsing response: ', error);
		return null;
	}
}

export async function fetchGitlab<T>(url: string, options: { method: string } = { method: 'GET' }, data?: Record<string, unknown>): Promise<T | { message: string } | null> {
	try {
		const payload: RequestInit = {
			headers: { ...getDefaultGitlabHeaders() },
			method: options.method,
		};

		if (data) {
			if (['POST', 'PUT'].includes(options.method)) {
				payload.body = JSON.stringify(data);
			} else if (options.method === 'GET') {
				url += buildQueryString(data as Record<string, string>);
			}
		}

		console.log(`Fetching ${options.method} ${GITLAB_BASE_URL}${url} ...`);
		const res = await fetch(`${GITLAB_BASE_URL}${url}`, payload);
		return await handleResponse<T>(res);
	} catch (error) {
		console.log('Error making GitLab request: ', error);
		return null;
	}
}

export async function fetchAllMrs(filter: Record<string, any> = {}): Promise<IMergeRequest[]> {
	const mrList: IMergeRequest[] = [];

	const fetchMergeRequestsPage = async (page: number): Promise<void> => {
		const fetchedMrList = await fetchGitlab<IMergeRequest[]>('/merge_requests', undefined, {
			state: 'opened',
			wip: 'no',
			per_page: 50,
			page,
			...filter,
		});

		if (fetchedMrList && 'message' in fetchedMrList) {
			console.log(`Error fetching all MRs: ${fetchedMrList.message}`);
			return;
		}

		if (fetchedMrList && 'length' in fetchedMrList && fetchedMrList.length > 0) {
			mrList.push(...fetchedMrList);
			await fetchMergeRequestsPage(page + 1);
		}
	};

	await fetchMergeRequestsPage(1);

	console.log(`Received ${mrList.length} MRs`);
	return mrList;
}

async function fetchDiffData(iid: number): Promise<IMergeRequestDiff[] | null> {
	const diffs = await fetchGitlab<IMergeRequestDiff[]>(`/merge_requests/${iid}/diffs`);
	if (!diffs) {
		return null;
	}

	if ('message' in diffs) {
		console.log(`Error fetching diffs data for MR ${iid}`);
		return null;
	}

	return diffs;
}

export async function fetchListDiffData(iids: number[]): Promise<IMergeRequestWithDiffs[]> {
	const diffList: IMergeRequestWithDiffs[] = [];

	// run in sequence to prevent gitlab overloading
	for (const iid of iids) {
		const data = await fetchDiffData(iid);
		if (data) {
			diffList.push({ diff: data, iid });
		}
	}
	return diffList;
}
