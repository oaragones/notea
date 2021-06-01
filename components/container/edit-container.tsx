import NoteState from 'libs/web/state/note'
import { has } from 'lodash'
import router, { useRouter } from 'next/router'
import { useCallback, useEffect } from 'react'
import NoteTreeState from 'libs/web/state/tree'
import NoteNav from 'components/note-nav'
import UIState from 'libs/web/state/ui'
import noteCache from 'libs/web/cache/note'
import useSettingsAPI from 'libs/web/api/settings'
import dynamic from 'next/dynamic'
import { useToast } from 'libs/web/hooks/use-toast'
import DeleteAlert from 'components/editor/delete-alert'

const MainEditor = dynamic(() => import('components/editor/main-editor'))

export const EditContainer = () => {
  const {
    title: { updateTitle },
    settings: { settings },
  } = UIState.useContainer()
  const { genNewId } = NoteTreeState.useContainer()
  const {
    fetchNote,
    abortFindNote,
    findOrCreateNote,
    initNote,
    note,
  } = NoteState.useContainer()
  const { query } = useRouter()
  const pid = query.pid as string
  const id = query.id as string
  const { mutate: mutateSettings } = useSettingsAPI()
  const toast = useToast()

  const loadNoteById = useCallback(
    async (id: string) => {
      // daily notes
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(id)) {
        findOrCreateNote(id, {
          id,
          title: id,
          content: '\n',
          pid: settings.daily_root_id,
        })
      } else if (id === 'new') {
        const url = `/${genNewId()}?new` + (pid ? `&pid=${pid}` : '')

        router.replace(url, undefined, { shallow: true })
      } else if (id && !has(router.query, 'new')) {
        try {
          await fetchNote(id)
        } catch (msg) {
          console.log(111, msg)
          if (msg.name !== 'AbortError') {
            toast(msg.message, 'error')
            router.push('/', undefined, { shallow: true })
          }
        }
      } else {
        if (await noteCache.getItem(id)) {
          router.push(`/${id}`, undefined, { shallow: true })
          return
        }

        initNote({
          id,
          content: '\n',
        })
      }

      mutateSettings({
        last_visit: `/${id}`,
      })
    },
    [
      mutateSettings,
      findOrCreateNote,
      settings.daily_root_id,
      genNewId,
      pid,
      fetchNote,
      toast,
      initNote,
    ]
  )

  useEffect(() => {
    abortFindNote()
    loadNoteById(id)
  }, [loadNoteById, abortFindNote, id])

  useEffect(() => {
    updateTitle(note?.title)
  }, [note?.title, updateTitle])

  return (
    <>
      <NoteNav />
      <DeleteAlert />
      <section className="h-full">
        <MainEditor />
      </section>
    </>
  )
}
