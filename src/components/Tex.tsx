import katex from 'katex'
import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

/** LaTeX puro (una expresión). */
export function Tex({ children, block = false }: { children: string; block?: boolean }) {
  let html: string
  try {
    html = katex.renderToString(children, { displayMode: block, throwOnError: false, strict: 'ignore', trust: false })
  } catch {
    html = children
  }
  return <span className={block ? 'tex-block' : 'tex-inline'} dangerouslySetInnerHTML={{ __html: html }} />
}

/** Texto con markdown y $LaTeX$ mezclados (también para respuestas del agente). */
export function Md({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: 'ignore' }]]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
