/** Matches backend src/constants/bookStatus.js */
export const BOOK_STATUSES = {
  PUBLISHED_LIVE: 'Published & Live',
  IN_PRODUCTION_COVER_DESIGN: 'In Production - Cover Design',
  IN_PRODUCTION_TYPESETTING: 'In Production - Typesetting',
};

export const BOOK_STATUS_VALUES = Object.values(BOOK_STATUSES);

export const PRODUCTION_STATUSES = [
  BOOK_STATUSES.IN_PRODUCTION_COVER_DESIGN,
  BOOK_STATUSES.IN_PRODUCTION_TYPESETTING,
];

export default BOOK_STATUSES;
