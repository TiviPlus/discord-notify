import * as core from '@actions/core'
import * as github from '@actions/github'
import fetch from 'node-fetch'

type Embed = {
  title?: string
  description: string
  color?: number
  author?: AuthorEmbed
  image?: ImageEmbed
  url?: string
}

type AuthorEmbed = {
  name: string
  icon_url: string
}

type ImageEmbed = {
  url: string
}

type Body = {
  avatar_url?: string
  username?: string
  embeds: Embed[]
  flags: number
}

async function run(): Promise<void> {
  try {
    const webhookUrl = core.getInput('webhook_url', {required: true})
    const title = core.getInput('title')
    const message = core.getInput('message')
    const avatar_url = core.getInput('avatar_url')
    const username = core.getInput('username')
    const colour = core.getInput('colour')
    const show_author = core.getBooleanInput('show_author')
    const include_image = core.getBooleanInput('include_image')
    const custom_image_url = core.getInput('custom_image_url')
    const title_url = core.getInput('title_url')

    const embed: Embed = {
      description: message
    }

    if (title === '') {
      const prNumber = github.context.payload.pull_request?.number // PRs # number
      const prUser = github.context.payload.pull_request?.user.login // PR creator
      const actionUser = github.context.actor // The user who performed the action
      const prMergedBy =
        github.context.payload.pull_request?.merged_by?.login || 'Unknown'

      if (github.context.payload.action === 'opened') {
        embed.title = `**Pull Request #${prNumber} Opened by ${prUser}**`
      } else if (github.context.payload.action === 'reopened') {
        embed.title = `**Pull Request #${prNumber} Reopened by ${actionUser}**`
      } else if (
        github.context.payload.action === 'closed' &&
        github.context.payload.pull_request?.merged
      ) {
        embed.title = `**Pull Request #${prNumber} Merged by ${prMergedBy}**`
      } else if (github.context.payload.action === 'closed') {
        embed.title = `**Pull Request #${prNumber} Closed by ${actionUser}**`
      } else {
        embed.title = `**Pull Request #${prNumber} Event**` // Fallback for unknown actions
      }
    }

    if (colour !== '') {
      embed.color = parseInt(colour.replace('#', ''), 16)
    } else if (
      github.context.payload.action === 'opened' ||
      github.context.payload.action === 'reopened'
    ) {
      embed.color = parseInt('#6cc644'.replace('#', ''), 16) // open or reopen. Github mantis color
    } else if (
      github.context.payload.action === 'closed' &&
      github.context.payload.pull_request?.merged
    ) {
      embed.color = parseInt('#6e5494'.replace('#', ''), 16) // merged. github butterfly bush color
    } else {
      embed.color = parseInt('#bd2c00'.replace('#', ''), 16) // pr closed or error. github milano red color
    }

    if (show_author) {
      if (github.context.payload.pull_request) {
        embed.author = {
          name: github.context.payload.pull_request.user.login,
          icon_url: github.context.payload.pull_request.user.avatar_url
        }
      }
    } else {
      embed.author = {
        name: github.context.actor,
        icon_url: ''
      }
    }

    if (title_url !== '') {
      embed.url = title_url
    }

    if (include_image) {
      if (github.context.payload.pull_request) {
        embed.image = {
          url: `https://opengraph.githubassets.com/${github.context.sha}/${github.context.repo.owner}/${github.context.repo.repo}/pull/${github.context.payload.pull_request.number}`
        }
      }
      if (custom_image_url !== '') {
        embed.image = {
          url: custom_image_url
        }
      }
    }

    const body: Body = {
      embeds: [embed],
      flags: 0 // flags: 4 (SUPPRESS_EMBEDS)
    }

    if (avatar_url !== '') {
      body.avatar_url = avatar_url
    }

    if (username !== '') {
      body.username = username
    }

    core.debug(JSON.stringify(body))

    const webhookUrls: string[] = webhookUrl
      .split(',')
      .map((url: string) => url.trim())
    for (const url of webhookUrls) {
      await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'}
      })
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
