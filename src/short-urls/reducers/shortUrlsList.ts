import { assoc, assocPath, reject } from 'ramda';
import PropTypes from 'prop-types';
import { Action, Dispatch } from 'redux';
import { shortUrlMatches } from '../helpers';
import { CREATE_VISIT, CreateVisitAction } from '../../visits/reducers/visitCreation';
import { ShortUrl, ShortUrlIdentifier } from '../data';
import { buildReducer } from '../../utils/helpers/redux';
import { GetState } from '../../container/types';
import { ShlinkApiClientBuilder } from '../../utils/services/types';
import { EditShortUrlTagsAction, SHORT_URL_TAGS_EDITED } from './shortUrlTags';
import { SHORT_URL_DELETED } from './shortUrlDeletion';
import { SHORT_URL_META_EDITED, ShortUrlMetaEditedAction, shortUrlMetaType } from './shortUrlMeta';
import { SHORT_URL_EDITED, ShortUrlEditedAction } from './shortUrlEdition';
import { ShortUrlsListParams } from './shortUrlsListParams';

/* eslint-disable padding-line-between-statements */
export const LIST_SHORT_URLS_START = 'shlink/shortUrlsList/LIST_SHORT_URLS_START';
export const LIST_SHORT_URLS_ERROR = 'shlink/shortUrlsList/LIST_SHORT_URLS_ERROR';
export const LIST_SHORT_URLS = 'shlink/shortUrlsList/LIST_SHORT_URLS';
/* eslint-enable padding-line-between-statements */

/** @deprecated Use ShortUrl interface instead */
export const shortUrlType = PropTypes.shape({
  shortCode: PropTypes.string,
  shortUrl: PropTypes.string,
  longUrl: PropTypes.string,
  visitsCount: PropTypes.number,
  meta: shortUrlMetaType,
  tags: PropTypes.arrayOf(PropTypes.string),
  domain: PropTypes.string,
});

interface ShortUrlsData {
  data: ShortUrl[];
}

export interface ShortUrlsList {
  shortUrls: ShortUrlsData;
  loading: boolean;
  error: boolean;
}

export interface ListShortUrlsAction extends Action<string> {
  shortUrls: ShortUrlsData;
  params: ShortUrlsListParams;
}

export type ListShortUrlsCombinedAction = (
  ListShortUrlsAction & EditShortUrlTagsAction & ShortUrlEditedAction & ShortUrlMetaEditedAction & CreateVisitAction
);

const initialState: ShortUrlsList = {
  shortUrls: {
    data: [],
  },
  loading: true,
  error: false,
};

const setPropFromActionOnMatchingShortUrl = <T extends ShortUrlIdentifier>(prop: keyof T) => (
  state: ShortUrlsList,
  { shortCode, domain, [prop]: propValue }: T,
): ShortUrlsList => assocPath(
  [ 'shortUrls', 'data' ],
  state.shortUrls.data.map(
    (shortUrl: ShortUrl) =>
      shortUrlMatches(shortUrl, shortCode, domain) ? { ...shortUrl, [prop]: propValue } : shortUrl,
  ),
  state,
);

export default buildReducer<ShortUrlsList, ListShortUrlsCombinedAction>({
  [LIST_SHORT_URLS_START]: (state) => ({ ...state, loading: true, error: false }),
  [LIST_SHORT_URLS_ERROR]: () => ({ loading: false, error: true, shortUrls: { data: [] } }),
  [LIST_SHORT_URLS]: (_, { shortUrls }) => ({ loading: false, error: false, shortUrls }),
  [SHORT_URL_DELETED]: (state, { shortCode, domain }) => assocPath(
    [ 'shortUrls', 'data' ],
    reject((shortUrl) => shortUrlMatches(shortUrl, shortCode, domain), state.shortUrls.data),
    state,
  ),
  [SHORT_URL_TAGS_EDITED]: setPropFromActionOnMatchingShortUrl<EditShortUrlTagsAction>('tags'),
  [SHORT_URL_META_EDITED]: setPropFromActionOnMatchingShortUrl<ShortUrlMetaEditedAction>('meta'),
  [SHORT_URL_EDITED]: setPropFromActionOnMatchingShortUrl<ShortUrlEditedAction>('longUrl'),
  [CREATE_VISIT]: (state, { shortUrl: { shortCode, domain, visitsCount } }) => assocPath(
    [ 'shortUrls', 'data' ],
    state.shortUrls && state.shortUrls.data && state.shortUrls.data.map(
      (shortUrl) => shortUrlMatches(shortUrl, shortCode, domain)
        ? assoc('visitsCount', visitsCount, shortUrl)
        : shortUrl,
    ),
    state,
  ),
}, initialState);

export const listShortUrls = (buildShlinkApiClient: ShlinkApiClientBuilder) => (
  params: ShortUrlsListParams = {},
) => async (dispatch: Dispatch, getState: GetState) => {
  dispatch({ type: LIST_SHORT_URLS_START });
  const { listShortUrls } = buildShlinkApiClient(getState);

  try {
    const shortUrls = await listShortUrls(params);

    dispatch<ListShortUrlsAction>({ type: LIST_SHORT_URLS, shortUrls, params });
  } catch (e) {
    dispatch({ type: LIST_SHORT_URLS_ERROR, params });
  }
};
