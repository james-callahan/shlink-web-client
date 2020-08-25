import PropTypes from 'prop-types';
import { Dispatch, Action } from 'redux';
import { ShortUrlMeta } from '../data';
import { ShlinkApiClientBuilder } from '../../utils/services/types';
import { GetState } from '../../container/types';
import { buildActionCreator, buildReducer } from '../../utils/helpers/redux';

/* eslint-disable padding-line-between-statements */
export const EDIT_SHORT_URL_META_START = 'shlink/shortUrlMeta/EDIT_SHORT_URL_META_START';
export const EDIT_SHORT_URL_META_ERROR = 'shlink/shortUrlMeta/EDIT_SHORT_URL_META_ERROR';
export const SHORT_URL_META_EDITED = 'shlink/shortUrlMeta/SHORT_URL_META_EDITED';
export const RESET_EDIT_SHORT_URL_META = 'shlink/shortUrlMeta/RESET_EDIT_SHORT_URL_META';
/* eslint-enable padding-line-between-statements */

/** @deprecated Use ShortUrlMeta interface instead */
export const shortUrlMetaType = PropTypes.shape({
  validSince: PropTypes.string,
  validUntil: PropTypes.string,
  maxVisits: PropTypes.number,
});

/** @deprecated Use ShortUrlMetaEdition interface instead */
export const shortUrlEditMetaType = PropTypes.shape({
  shortCode: PropTypes.string,
  meta: shortUrlMetaType.isRequired,
  saving: PropTypes.bool.isRequired,
  error: PropTypes.bool.isRequired,
});

export interface ShortUrlMetaEdition {
  shortCode: string | null;
  meta: ShortUrlMeta;
  saving: boolean;
  error: boolean;
}

interface ShortUrlMetaEditedAction extends Action<string> {
  shortCode: string;
  domain?: string | null;
  meta: ShortUrlMeta;
}

const initialState: ShortUrlMetaEdition = {
  shortCode: null,
  meta: {},
  saving: false,
  error: false,
};

export default buildReducer<ShortUrlMetaEdition, ShortUrlMetaEditedAction>({
  [EDIT_SHORT_URL_META_START]: (state) => ({ ...state, saving: true, error: false }),
  [EDIT_SHORT_URL_META_ERROR]: (state) => ({ ...state, saving: false, error: true }),
  [SHORT_URL_META_EDITED]: (_, { shortCode, meta }) => ({ shortCode, meta, saving: false, error: false }),
  [RESET_EDIT_SHORT_URL_META]: () => initialState,
}, initialState);

export const editShortUrlMeta = (buildShlinkApiClient: ShlinkApiClientBuilder) => (
  shortCode: string,
  domain: string | null | undefined,
  meta: ShortUrlMeta,
) => async (dispatch: Dispatch, getState: GetState) => {
  dispatch({ type: EDIT_SHORT_URL_META_START });
  const { updateShortUrlMeta } = buildShlinkApiClient(getState);

  try {
    await updateShortUrlMeta(shortCode, domain, meta);
    dispatch<ShortUrlMetaEditedAction>({ shortCode, meta, domain, type: SHORT_URL_META_EDITED });
  } catch (e) {
    dispatch({ type: EDIT_SHORT_URL_META_ERROR });

    throw e;
  }
};

export const resetShortUrlMeta = buildActionCreator(RESET_EDIT_SHORT_URL_META);
