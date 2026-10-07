import { describe, expect, it } from 'vitest'
import { resolveSurgeryInstitutionLocationForManualCheck } from '@/hooks/useCirugiaActions'
import { EMPTY_NEW_FORM } from '@/lib/cirugias.types'

describe('resolveSurgeryInstitutionLocationForManualCheck', () => {
  const baseForm = {
    institutionContactId: 'institution-1',
    provincia: '',
    localidad: '',
    institutionCity: EMPTY_NEW_FORM.institutionCity,
  }

  it('returns ok when no manual geography is entered', () => {
    expect(resolveSurgeryInstitutionLocationForManualCheck(baseForm)).toEqual({ ok: true })
  })

  it('returns ok when manual fields exactly match the store snapshot (prev-compat path)', () => {
    const result = resolveSurgeryInstitutionLocationForManualCheck(
      { ...baseForm, provincia: 'Corrientes', localidad: 'Goya' },
      { resolveFromStore: () => ({ provincia: 'Corrientes', localidad: 'Goya' }) }
    )
    expect(result).toEqual({ ok: true })
  })

  it('returns a mismatch reason when manual province differs from the store snapshot', () => {
    const result = resolveSurgeryInstitutionLocationForManualCheck(
      { ...baseForm, provincia: 'Buenos Aires' },
      { resolveFromStore: () => ({ provincia: 'Corrientes', localidad: 'Goya' }) }
    )
    expect(result).toEqual({ ok: false, reason: 'mismatch' })
  })

  it('returns a not-resolved reason when no store data and no selected snapshot are available', () => {
    const result = resolveSurgeryInstitutionLocationForManualCheck(
      { ...baseForm, provincia: 'Corrientes' },
      { resolveFromStore: () => undefined }
    )
    expect(result).toEqual({ ok: false, reason: 'institution-not-resolved' })
  })

  it('allows manual fields when the dialog passes a pre-loaded selected institution matching the store', () => {
    const result = resolveSurgeryInstitutionLocationForManualCheck(
      { ...baseForm, provincia: 'Corrientes', localidad: 'Goya' },
      {
        resolveFromStore: () => ({ provincia: 'Corrientes', localidad: 'Goya' }),
        selectedInstitution: { id: 'institution-1', provincia: 'Corrientes', localidad: 'Goya' },
      }
    )
    expect(result).toEqual({ ok: true })
  })

  it('allows manual fields when the dialog passes a pre-loaded selected institution even if the store is empty (NEW path)', () => {
    const result = resolveSurgeryInstitutionLocationForManualCheck(
      { ...baseForm, provincia: 'Corrientes', localidad: 'Goya' },
      {
        resolveFromStore: () => undefined,
        selectedInstitution: { id: 'institution-1', provincia: 'Corrientes', localidad: 'Goya' },
      }
    )
    expect(result).toEqual({ ok: true })
  })

  it('treats institutionCity=default as a no-op (existing behaviour preserved)', () => {
    const result = resolveSurgeryInstitutionLocationForManualCheck(
      { ...baseForm, institutionCity: EMPTY_NEW_FORM.institutionCity },
      { resolveFromStore: () => ({ provincia: 'Corrientes', localidad: 'Goya' }) }
    )
    expect(result).toEqual({ ok: true })
  })

  it('rejects a different manual city that does not match the institution locality', () => {
    const result = resolveSurgeryInstitutionLocationForManualCheck(
      { ...baseForm, institutionCity: 'Otra ciudad' },
      { resolveFromStore: () => ({ provincia: 'Corrientes', localidad: 'Goya' }) }
    )
    expect(result).toEqual({ ok: false, reason: 'mismatch' })
  })

  it('prefers the store over a mismatched selected snapshot (store is authoritative)', () => {
    const result = resolveSurgeryInstitutionLocationForManualCheck(
      { ...baseForm, provincia: 'Corrientes', localidad: 'Goya' },
      {
        resolveFromStore: () => ({ provincia: 'Corrientes', localidad: 'Goya' }),
        selectedInstitution: { id: 'different-id', provincia: 'Corrientes', localidad: 'Goya' },
      }
    )
    expect(result).toEqual({ ok: true })
  })

  it('reports a mismatch when the store has the institution but the manual fields disagree with the store', () => {
    const result = resolveSurgeryInstitutionLocationForManualCheck(
      { ...baseForm, provincia: 'Corrientes', localidad: 'Goya' },
      {
        resolveFromStore: () => ({ provincia: 'Mendoza', localidad: 'Capital' }),
        selectedInstitution: { id: 'institution-1', provincia: 'Corrientes', localidad: 'Goya' },
      }
    )
    expect(result).toEqual({ ok: false, reason: 'mismatch' })
  })
})
