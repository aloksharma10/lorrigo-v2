export function createQueryString(params: Record<string, string | number | undefined>) {
   const searchParams = new URLSearchParams()

   Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
         searchParams.set(key, String(value))
      }
   })

   return searchParams.toString()
}

export function parseSearchParams(searchParams: URLSearchParams) {
   const params: Record<string, any> = {}

   for (const [key, value] of searchParams.entries()) {
      if (key === 'page' || key === 'pageSize') {
         params[key] = parseInt(value, 10)
      } else if (key === 'sort' || key === 'filters') {
         try {
            params[key] = JSON.parse(value)
         } catch {
            params[key] = []
         }
      } else if (key === 'dateFrom' || key === 'dateTo') {
         params[key] = new Date(value)
      } else {
         params[key] = value
      }
   }

   return params
}