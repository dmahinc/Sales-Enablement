/** Material category: Product, GTM, or Other */
export type MaterialCategory = 'product' | 'gtm' | 'other'

export const PRODUCT_MATERIAL_TYPES = [
  { value: 'product_brief', label: 'Product Brief' },
  { value: 'sales_enablement_deck', label: 'Sales Enablement Deck' },
  { value: 'sales_deck', label: 'Sales Deck' },
  { value: 'datasheet', label: 'Datasheet' },
  { value: 'product_portfolio', label: 'Product Portfolio' },
  { value: 'product_catalog', label: 'Product Catalog' },
] as const

export const GTM_MATERIAL_TYPES = [
  { value: 'gtm_playbook', label: 'GTM Playbook' },
  { value: 'gtm_sales_deck', label: 'GTM Sales Deck' },
  { value: 'customer_story', label: 'Customer Story / Case Study' },
  { value: 'channel_enablement_kit', label: 'Channel Enablement Kit' },
  { value: 'roi_business_case', label: 'ROI / Business Case' },
  { value: 'persona_selling_guide', label: 'Persona Selling Guide' },
  { value: 'win_loss_summary', label: 'Win/Loss Summary' },
  { value: 'pricing_summary', label: 'Pricing Summary' },
  { value: 'market_brief', label: 'Market Brief' },
  { value: 'campaign_content', label: 'Campaign content' },
] as const

const PRODUCT_VALUES = new Set(PRODUCT_MATERIAL_TYPES.map(t => t.value))
const GTM_VALUES = new Set(GTM_MATERIAL_TYPES.map(t => t.value))

/** Derive category from material_type (for editing existing materials) */
export function getMaterialCategory(materialType: string | null | undefined): MaterialCategory {
  if (!materialType) return 'product'
  const t = materialType.toLowerCase().trim()
  if (PRODUCT_VALUES.has(t)) return 'product'
  if (GTM_VALUES.has(t)) return 'gtm'
  return 'other'
}

/** Get audience that should be set for a material type */
export function getDefaultAudienceForType(materialType: string): 'internal' | 'customer_facing' {
  const t = materialType.toLowerCase().trim()
  const internalTypes = new Set([
    'product_brief', 'sales_enablement_deck', 'product_portfolio', 'product_catalog',
    'gtm_playbook', 'gtm_sales_deck', 'channel_enablement_kit', 'roi_business_case',
    'persona_selling_guide', 'win_loss_summary', 'pricing_summary', 'market_brief',
    'campaign_content',
  ])
  if (internalTypes.has(t)) return 'internal'
  if (['datasheet', 'sales_deck', 'customer_story'].includes(t)) return 'customer_facing'
  return 'internal'
}

/** Whether audience can be changed by user for this type */
export function canChangeAudience(materialType: string): boolean {
  return ['other', 'sales_deck', 'gtm_sales_deck', 'customer_story'].includes(materialType)
}
