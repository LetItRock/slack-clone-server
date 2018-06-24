export default `
  type Channel {
    id: Int!
    name: String!
    public: Boolean!
    messages: [Message!]!
    users: [User!]!
    dm: Boolean!
  }

  type ChannelResponse {
    ok: Boolean!
    channel: Channel
    errors: [Error!]
  }

  type DmChannelResponse {
    id: Int!
    name: String!
    dm: Boolean!
  }

  type Mutation {
    createChannel(teamId: Int!, name: String!, public: Boolean=false, members: [Int!] = []): ChannelResponse!
    getOrCreateDmChannel(teamId: Int!, members: [Int!]!): DmChannelResponse!
  }
`;
