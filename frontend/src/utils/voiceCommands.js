const FACILITY_KEYWORDS = [
  [/\bgym|fitness\b/i, 'gym'],
  [/\bpool|swim(ming)?\b/i, 'pool'],
  [/\bclub\s?house\b/i, 'clubhouse'],
  [/\btennis\b/i, 'tennis-court'],
  [/\bplayground|park\b/i, 'playground'],
  [/\bparty\s?hall|banquet\b/i, 'party-hall'],
  [/\bconference|meeting\s?room\b/i, 'conference-room'],
];

const COMPLAINT_KEYWORDS = [
  [/\bplumb(ing)?|leak|pipe|tap|water\b/i, 'plumbing'],
  [/\belectric(al|ity)?|power cut|wiring|light|fan\b/i, 'electrical'],
  [/\bclean(ing)?|garbage|trash|dust|sweep\b/i, 'cleaning'],
  [/\bsecurity|guard|theft\b/i, 'security'],
  [/\belevator|lift\b/i, 'elevator'],
  [/\bparking|car park\b/i, 'parking'],
  [/\bnoise|loud\b/i, 'noise'],
];

const MARKET_CATEGORY_KEYWORDS = [
  [/\bart|paint(ing)?|canvas|craft|handmade|handcraft|drawing|sketch|sculpture|decor\b/i, 'art'],
];

const NAV_TARGETS = [
  [/\b(home|dashboard)\b/i, '/app/dashboard'],
  [/\b(payment|due|bill)s?\b/i, '/app/payments'],
  [/\bvisitors?\b/i, '/app/visitors'],
  [/\b(notice|announcement)s?\b/i, '/app/notices'],
  [/\bbookings?\b/i, '/app/bookings'],
  [/\bmarket(place)?\b/i, '/app/marketplace'],
  [/\bprofile\b/i, '/app/profile'],
  [/\bcomplaints?|maintenance\b/i, '/app/complaints'],
  [/\bvehicles?\b/i, '/app/vehicles'],
  [/\bforum\b/i, '/app/forum'],
];

function extractTime(text) {
  let m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (m) {
    let hour = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[3])) hour += 12;
    return { hour, minute: m[2] ? parseInt(m[2], 10) : 0 };
  }
  m = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i);
  if (m) return { hour: parseInt(m[1], 10) % 24, minute: m[2] ? parseInt(m[2], 10) : 0 };
  return null;
}

function extractDate(text) {
  const date = new Date();
  if (/\btomorrow\b/i.test(text)) date.setDate(date.getDate() + 1);
  return date;
}

// yyyy-mm-dd in the browser's own local timezone — avoids the UTC-shift bug that
// `date.toISOString().split('T')[0]` has late at night in timezones ahead of UTC.
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Pull a rupee amount out of phrases like "for 200", "at ₹150", "250 rupees",
// "price tag of 250", "priced at 300".
function extractPrice(text) {
  let m = text.match(/(?:for|at|priced?|worth|price(?:\s+tag)?)\s+(?:of|is|at|around|about)?\s*₹?\s*(\d{1,7})/i);
  if (m) return m[1];
  m = text.match(/₹\s*(\d{1,7})/);
  if (m) return m[1];
  m = text.match(/(\d{1,7})\s*(?:rupees?|rs\b|₹|inr|bucks)/i);
  return m ? m[1] : '';
}

// Grab the product name. Prefer an explicit "named/called/titled X"; otherwise take the
// phrase that sits between the "sell/list/add" verb and the price/marketplace clause.
function extractProductTitle(text) {
  let m = text.match(/\b(?:named|called|titled|title|name)\s+(?:is\s+|as\s+|it\s+)?["']?([\w][\w &'-]*?)["']?(?:\s+(?:for|at|priced?|worth|₹|rs\.?|rupees?)\b|[.,]|$)/i);
  if (m && m[1].trim()) return capitalize(m[1].trim());

  m = text.match(/(?:sell(?:ing)?|list(?:ing)?|add|post|put\s+up)\s+(?:my|a|an|the|some|this|new)?\s*(.+?)(?:\s+(?:for|at|priced?|worth|price(?:\s+tag)?|₹|rs\.?|rupees?|in\s+(?:the\s+)?market(?:place)?|with\b)\b|[.,]|$)/i);
  let title = (m ? m[1] : '').replace(/\b(new\s+)?(item|product|listing)s?\b/gi, '').replace(/\bin\s+(the\s+)?market(place)?\b/gi, '').trim();
  return title ? capitalize(title) : '';
}

// Turn a spoken sentence into a clean maintenance description, stripping the
// leading command verbs so the field reads naturally.
function extractComplaintDescription(text, category) {
  let desc = text
    .replace(/^\s*(please\s+)?(raise|create|log|file|open|report|submit|make)\s+(a|an|the)?\s*/i, '')
    .replace(/^\s*(new\s+)?(maintenance\s+)?(request|complaint|issue|problem|ticket)\s*/i, '')
    .replace(/^\s*(for|about|regarding|of|on|:|-)\s*/i, '')
    .replace(/\bin\s+the\s+community\b/i, '')
    .trim();
  desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  if (desc.trim().length < 10) desc = `${category.charAt(0).toUpperCase() + category.slice(1)} issue reported via the voice assistant.`;
  return desc;
}

function matchNavigation(text) {
  if (!/\b(show|open|go to|take me to|navigate to|view)\b/i.test(text)) return null;
  const found = NAV_TARGETS.find(([re]) => re.test(text));
  return found ? found[1] : null;
}

// Lightweight, fully local keyword/regex parser — no external NLU call.
// Instead of silently completing an action, a matched command now opens the matching
// form with every field it could infer pre-filled, so the user just reviews it, adds a
// photo where relevant, and confirms. The prefill travels via React Router location state.
export async function runVoiceCommand(text, { navigate, role }) {
  const residentOnly = (label) => ({ message: `Voice ${label} is available for residents only.`, severity: 'error' });

  // ── Explicit "show/open/view …" navigation wins first ───────
  // so "show my maintenance" opens the page instead of a create form. Creation verbs
  // (book / sell / raise / report) are not navigation triggers, so they fall through.
  const navTarget = matchNavigation(text);
  if (navTarget && !/\b(book|reserve|sell(ing)?|raise|report|create|log|file)\b/i.test(text)) {
    navigate(navTarget);
    return { message: `Opening ${navTarget.replace('/app/', '')}.` };
  }

  // ── Book a facility ─────────────────────────────────────────
  const isBooking = /\b(book|reserve|reservation)\b/i.test(text);
  const facilityMatch = FACILITY_KEYWORDS.find(([re]) => re.test(text));
  if (isBooking && facilityMatch) {
    if (role !== 'Resident') return residentOnly('booking');
    const targetDate = extractDate(text);
    navigate('/app/bookings', {
      state: {
        voicePrefill: {
          type: 'facility-booking',
          facilityType: facilityMatch[1],
          dateStr: localDateStr(targetDate),
          requestedTime: extractTime(text),
        },
      },
    });
    return { message: `Opening a booking for the ${facilityMatch[1].replace('-', ' ')} — pick your slot and confirm.` };
  }

  // ── Sell / list a marketplace product ───────────────────────
  const isSelling = /\bsell(ing)?\b/i.test(text)
    || /\bput\s+up\b/i.test(text)
    || (/\b(list|add|post|create|put)\b/i.test(text) && /\b(item|product|listing|market(place)?)\b/i.test(text))
    || /\blist(ing)?\b[^.]*\bfor\b[^.]*\d/i.test(text);
  if (isSelling) {
    const categoryMatch = MARKET_CATEGORY_KEYWORDS.find(([re]) => re.test(text));
    navigate('/app/marketplace', {
      state: {
        voicePrefill: {
          type: 'marketplace',
          category: categoryMatch ? categoryMatch[1] : 'food',
          title: extractProductTitle(text),
          price: extractPrice(text),
        },
      },
    });
    return { message: 'Opening your listing — check the details, add a photo and publish.' };
  }

  // ── Raise a maintenance request / complaint ─────────────────
  const complaintTrigger = /\b(complaint|maintenance|issue|problem|broken|report|fix|repair|not working)\b/i.test(text);
  const categoryMatch = COMPLAINT_KEYWORDS.find(([re]) => re.test(text));
  if (complaintTrigger && (categoryMatch || /\bmaintenance|complaint\b/i.test(text))) {
    if (role !== 'Resident') return residentOnly('maintenance requests');
    const category = categoryMatch ? categoryMatch[1] : 'other';
    const scope = /\bcommunity|shared|common\s+area\b/i.test(text) ? 'community' : 'personal';
    navigate('/app/complaints', {
      state: {
        voicePrefill: {
          type: 'complaint',
          category,
          scope,
          description: extractComplaintDescription(text, category),
        },
      },
    });
    return { message: `Opening a ${scope} ${category} request — add a photo if you have one and submit.` };
  }

  return {
    message: `Heard: "${text}". Try "book the gym at 6pm", "sell homemade cake for 200", or "raise a maintenance request for the leaking tap".`,
    severity: 'info',
  };
}
