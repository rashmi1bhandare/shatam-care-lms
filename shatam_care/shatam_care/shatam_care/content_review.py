"""Draft -> Submitted for Review -> Approved/Rejected workflow for teacher-
authored lessons, via a Custom Field on stock lms's `Course Lesson`
(see ../../SCHEMA.md). Approving/rejecting requires the "review" capability
(admins always have it); anyone may move a lesson into review.
"""

import frappe
from frappe.utils import now_datetime

from shatam_care.shatam_care.capabilities import has_capability, is_admin


def validate_lesson_review_status(doc, method=None):
	if not doc.has_value_changed("review_status"):
		return

	if doc.review_status == "Submitted for Review":
		doc.submitted_on = now_datetime()
	elif doc.review_status in ("Approved", "Rejected"):
		# Capability-based, not role-based: a coordinator delegated "review" can
		# approve even though they hold no System Manager/Moderator role. This
		# runs as a validate hook, so it still fires when review_lesson() saves
		# with ignore_permissions (that flag skips permission checks, not hooks),
		# making it the real backstop for who may approve.
		if not (is_admin() or has_capability("review")):
			frappe.throw(frappe._("You don't have permission to approve or reject lessons."))
		doc.reviewed_by = frappe.session.user
		doc.reviewed_on = now_datetime()
