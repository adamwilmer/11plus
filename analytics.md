# Analytics

## GA4 property

Measurement ID: `G-D3WEQL5WH3`

Pages instrumented with the GA tag:
- `index.html`
- `performance.html`
- `mistakes.html`

## Event summary

Core flow:
- `page_view` (virtual screen views for SPA screens)
- `exam_selected`
- `test_started`
- `test_completed`
- `test_abandoned`
- `test_resumed`
- `review_started`

Timer and session:
- `timer_toggled`
- `timer_started`
- `timer_expired`

Performance and review:
- `category_breakdown_viewed`
- `trends_viewed`
- `mistakes_review_opened`

Resume + per-question engagement:
- `resume_modal_shown`
- `resume_discarded`
- `question_viewed`
- `option_selected`

## Key parameters worth registering as custom dimensions

- `exam_type`
- `test_name`
- `question_index`
- `question_id`
- `answered_count`
- `total_questions`
- `reason`

Notes:
- `test_completed` is a good conversion event.
- `test_started` can be a secondary conversion if you want to track starts.
