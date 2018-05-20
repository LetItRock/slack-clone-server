export default `
  type DirectMessage {
    id: Int!
    text: String
    created_at: String! 
    sender: User!
    receiverId: Int!
  }

  type Subscription {
    newDirectMessage(teamId: Int!, userId: Int!): DirectMessage!
  }

  type Query {
    directMessages(teamId: Int!, otherUserId: Int!): [DirectMessage!]!
  }

  type Mutation {
    createDirectMessage(receiverId: Int!, text: String!, teamId: Int!): Boolean!
  }
`;
