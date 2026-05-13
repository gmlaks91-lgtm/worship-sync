/** setlists + setlist_songs + setlist_lineups 공통 select (송리스트). */
export const PREP_SETLIST_NESTED_SELECT = `
  id,
  title,
  event_date,
  status,
  staff_notes,
  setlist_songs (
    order_index,
    songs (
      id,
      title,
      youtube_url,
      description
    )
  ),
  setlist_lineups (
    role_code,
    member_id,
    profiles ( username )
  )
` as const;
