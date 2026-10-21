"use client";

import { decodeParam } from "@/lib/route-params";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
	AssessmentQuestion,
	CourseAdminDetail,
	addAssessmentQuestion,
	addInstructor,
	createFinalAssessment,
	getAssessmentQuestions,
	getCourseAdminDetail,
	removeAssessmentQuestion,
	removeInstructor,
	searchUsers,
	addCourseEvaluator,
	removeCourseEvaluator,
	updateCourseAdmin,
} from "@/lib/lms-api";

export default function AdminCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id: rawCourseId } = use(params);
	const courseId = decodeParam(rawCourseId);
	const [detail, setDetail] = useState<CourseAdminDetail | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function reload() {
		setDetail(await getCourseAdminDetail(courseId));
	}

	useEffect(() => {
		let cancelled = false;
		getCourseAdminDetail(courseId)
			.then((data) => {
				if (!cancelled) setDetail(data);
			})
			.catch(() => {
				if (!cancelled) setError("Could not load this course.");
			});
		return () => {
			cancelled = true;
		};
	}, [courseId]);

	if (error) return <div className="max-w-3xl mx-auto px-6 py-10 text-red-600">{error}</div>;
	if (!detail) return <div className="max-w-3xl mx-auto px-6 py-10 text-gray-500">Loading...</div>;

	return (
		<div className="max-w-3xl mx-auto px-6 py-10 space-y-5">
			<Link href="/admin/courses" className="text-sm text-green-700 hover:underline">
				&larr; All courses
			</Link>

			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-green-900">{detail.title}</h1>
				<button
					onClick={async () => {
						await updateCourseAdmin(courseId, { published: detail.published ? 0 : 1 });
						reload();
					}}
					className={`rounded px-4 py-2 text-sm ${
						detail.published
							? "border border-gray-400 text-gray-700"
							: "bg-green-700 text-white"
					}`}
				>
					{detail.published ? "Unpublish" : "Publish"}
				</button>
			</div>
			<p className="text-sm text-gray-500">
				{detail.lesson_count} lessons &middot; {detail.published ? "Published" : "Draft"}
			</p>

			<InstructorsSection detail={detail} courseId={courseId} onChange={reload} />
			<EvaluatorSection detail={detail} courseId={courseId} onChange={reload} />
			<AssessmentSection detail={detail} courseId={courseId} onChange={reload} />
		</div>
	);
}

function UserPicker({
	placeholder,
	onSelect,
}: {
	placeholder: string;
	onSelect: (user: string) => Promise<void>;
}) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<{ name: string; full_name: string }[]>([]);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		let cancelled = false;
		// Debounced either way — short queries resolve to an empty list inside
		// the timer rather than clearing state in the effect body.
		const timer = setTimeout(() => {
			if (query.length < 2) {
				if (!cancelled) setResults([]);
				return;
			}
			searchUsers(query)
				.then((rows) => {
					if (!cancelled) setResults(rows);
				})
				.catch(() => {});
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [query]);

	return (
		<div className="space-y-1">
			<input
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder={placeholder}
				className="w-full border rounded px-3 py-2 text-sm"
			/>
			{results.length > 0 && (
				<ul className="border rounded divide-y bg-white">
					{results.map((user) => (
						<li key={user.name}>
							<button
								disabled={busy}
								onClick={async () => {
									setBusy(true);
									try {
										await onSelect(user.name);
										setQuery("");
										setResults([]);
									} finally {
										setBusy(false);
									}
								}}
								className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 disabled:opacity-50"
							>
								{user.full_name}{" "}
								<span className="text-gray-400 text-xs">({user.name})</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function InstructorsSection({
	detail,
	courseId,
	onChange,
}: {
	detail: CourseAdminDetail;
	courseId: string;
	onChange: () => Promise<void>;
}) {
	return (
		<section className="bg-white rounded-lg border border-green-100 p-4 space-y-3">
			<h2 className="font-semibold text-green-800">Teachers</h2>
			{detail.instructors.length === 0 && (
				<p className="text-sm text-gray-500">No teachers assigned yet.</p>
			)}
			<ul className="space-y-1">
				{detail.instructors.map((instructor) => (
					<li key={instructor.name} className="flex items-center justify-between text-sm">
						<span>
							{instructor.full_name}{" "}
							<span className="text-gray-400 text-xs">({instructor.name})</span>
						</span>
						<button
							onClick={async () => {
								await removeInstructor(courseId, instructor.name);
								await onChange();
							}}
							className="text-red-600 text-xs underline"
						>
							Remove
						</button>
					</li>
				))}
			</ul>
			<UserPicker
				placeholder="Search a user to add as teacher..."
				onSelect={async (user) => {
					await addInstructor(courseId, user);
					await onChange();
				}}
			/>
			<p className="text-xs text-gray-500">
				Adding a teacher also grants them the Course Creator role.
			</p>
		</section>
	);
}

function EvaluatorSection({
	detail,
	courseId,
	onChange,
}: {
	detail: CourseAdminDetail;
	courseId: string;
	onChange: () => Promise<void>;
}) {
	const evaluators = detail.evaluators ?? [];
	return (
		<section className="bg-white rounded-lg border border-green-100 p-4 space-y-3">
			<h2 className="font-semibold text-green-800">Certificate Evaluators</h2>
			{evaluators.length === 0 && (
				<p className="text-sm text-amber-700">
					Nobody assigned yet — an admin can still approve, but naming someone makes
					responsibility explicit.
				</p>
			)}
			<ul className="space-y-1">
				{evaluators.map((person) => (
					<li key={person.name} className="flex items-center justify-between text-sm">
						<span>
							{person.full_name}{" "}
							<span className="text-gray-500 text-xs">({person.name})</span>
						</span>
						<button
							onClick={async () => {
								await removeCourseEvaluator(courseId, person.name);
								await onChange();
							}}
							className="text-red-600 text-xs underline"
						>
							Remove
						</button>
					</li>
				))}
			</ul>
			<UserPicker
				placeholder="Search a user to add as evaluator..."
				onSelect={async (user) => {
					await addCourseEvaluator(courseId, user);
					await onChange();
				}}
			/>
			<p className="text-xs text-gray-600">
				A course can have several evaluators. Adding someone grants them the
				&ldquo;Approve certificates&rdquo; right. Administrators are always included and
				cannot be removed.
			</p>
		</section>
	);
}

function AssessmentSection({
	detail,
	courseId,
	onChange,
}: {
	detail: CourseAdminDetail;
	courseId: string;
	onChange: () => Promise<void>;
}) {
	const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
	const [title, setTitle] = useState("Final Assessment");
	const [passing, setPassing] = useState(70);
	const [creating, setCreating] = useState(false);

	const quizName = detail.final_assessment?.name;

	async function loadQuestions() {
		if (!quizName) return;
		setQuestions(await getAssessmentQuestions(quizName));
	}

	useEffect(() => {
		if (!quizName) return;
		let cancelled = false;
		getAssessmentQuestions(quizName)
			.then((rows) => {
				if (!cancelled) setQuestions(rows);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [quizName]);

	if (!quizName) {
		return (
			<section className="bg-white rounded-lg border border-green-100 p-4 space-y-3">
				<h2 className="font-semibold text-green-800">Final Assessment</h2>
				<p className="text-sm text-amber-700">
					Not created yet. Learners can&apos;t be certified without one.
				</p>
				<div className="flex gap-2">
					<input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className="flex-1 border rounded px-3 py-2 text-sm"
					/>
					<input
						type="number"
						value={passing}
						onChange={(e) => setPassing(Number(e.target.value))}
						className="w-24 border rounded px-3 py-2 text-sm"
						min={1}
						max={100}
					/>
					<button
						disabled={creating}
						onClick={async () => {
							setCreating(true);
							try {
								await createFinalAssessment(courseId, title, passing);
								await onChange();
							} finally {
								setCreating(false);
							}
						}}
						className="bg-green-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
					>
						Create
					</button>
				</div>
				<p className="text-xs text-gray-500">Title and pass percentage.</p>
			</section>
		);
	}

	return (
		<section className="bg-white rounded-lg border border-green-100 p-4 space-y-3">
			<h2 className="font-semibold text-green-800">
				Final Assessment: {detail.final_assessment?.title}
			</h2>
			<div className="space-y-3">
				{questions.map((question, index) => (
					<div key={question.name} className="rounded-lg border border-gray-200 p-4 space-y-2">
						<div className="flex justify-between gap-3">
							<div className="flex gap-2.5 flex-1">
								<span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-semibold flex items-center justify-center">
									{index + 1}
								</span>
								<div
									className="flex-1 text-gray-900 font-medium [&_p]:m-0"
									dangerouslySetInnerHTML={{ __html: question.question }}
								/>
							</div>
							<button
								onClick={async () => {
									await removeAssessmentQuestion(quizName, question.name);
									await loadQuestions();
								}}
								className="text-red-600 text-sm shrink-0 hover:underline"
							>
								Remove
							</button>
						</div>
						{!!question.multiple && (
							<p className="ml-8 text-xs font-medium text-green-700">Select all that apply</p>
						)}
						<ul className="ml-8 space-y-1.5">
							{[question.option_1, question.option_2, question.option_3, question.option_4]
								.filter(Boolean)
								.map((option) => (
									<li key={option} className="flex items-center gap-2 text-sm text-gray-700">
										<span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
										{option}
									</li>
								))}
						</ul>
					</div>
				))}
			</div>
			{questions.length === 0 && (
				<p className="text-sm text-gray-500">No questions yet — add at least one.</p>
			)}
			<AddQuestionForm quizName={quizName} onAdded={loadQuestions} />
		</section>
	);
}

function AddQuestionForm({ quizName, onAdded }: { quizName: string; onAdded: () => Promise<void> }) {
	const [text, setText] = useState("");
	const [options, setOptions] = useState(["", ""]);
	const [correct, setCorrect] = useState<number[]>([]);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleAdd(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		const filled = options.map((o) => o.trim()).filter(Boolean);
		if (!correct.length) {
			setError("Mark at least one option as correct.");
			return;
		}
		setSaving(true);
		try {
			await addAssessmentQuestion(quizName, text, filled, correct);
			setText("");
			setOptions(["", ""]);
			setCorrect([]);
			await onAdded();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not add the question.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<form onSubmit={handleAdd} className="border-t pt-4 space-y-3">
			<div>
				<h3 className="font-semibold text-green-800">Add a question</h3>
				<p className="text-xs text-gray-500 mt-0.5">
					Mark &ldquo;Correct&rdquo; next to each right answer. Marking more than one makes it a
					multi-answer question. Up to 4 options.
				</p>
			</div>
			<textarea
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="Type the question here"
				className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base min-h-[72px]"
				required
			/>
			<div className="space-y-2">
				{options.map((option, i) => {
					const isCorrect = correct.includes(i);
					return (
						<div key={i} className="flex items-center gap-2">
							<input
								value={option}
								onChange={(e) => {
									const next = [...options];
									next[i] = e.target.value;
									setOptions(next);
								}}
								placeholder={`Option ${i + 1}`}
								className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-base"
								required
							/>
							<button
								type="button"
								onClick={() =>
									setCorrect((prev) =>
										prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
									)
								}
								className={`flex-shrink-0 rounded-lg border-2 px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
									isCorrect
										? "border-green-600 bg-green-50 text-green-800"
										: "border-gray-200 text-gray-500 hover:border-green-300"
								}`}
							>
								<span
									className={`w-4 h-4 rounded-sm border flex items-center justify-center text-white text-[10px] font-bold ${
										isCorrect ? "bg-green-600 border-green-600" : "border-gray-400"
									}`}
								>
									{isCorrect ? "✓" : ""}
								</span>
								Correct
							</button>
						</div>
					);
				})}
			</div>
			{options.length < 4 && (
				<div>
					<button
						type="button"
						onClick={() => setOptions([...options, ""])}
						className="text-sm text-green-700 font-medium hover:underline"
					>
						+ Add option
					</button>
				</div>
			)}
			{error && <p className="text-sm text-red-600">{error}</p>}
			<div className="pt-1">
				<button
					type="submit"
					disabled={saving}
					className="bg-green-700 text-white rounded-lg px-5 py-2.5 text-base font-semibold disabled:opacity-50 hover:bg-green-800 transition-colors"
				>
					{saving ? "Adding..." : "Add question"}
				</button>
			</div>
		</form>
	);
}
