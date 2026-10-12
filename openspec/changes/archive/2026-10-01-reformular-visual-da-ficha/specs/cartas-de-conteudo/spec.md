# Spec Delta

## MODIFIED Requirements

### Requirement: Apresentação temporária
O Narrador SHALL poder apresentar uma carta a participantes sem transferir sua posse nem torná-la permanentemente disponível. Cada participante SHALL ver a carta apresentada **uma vez**: depois que ele a fecha, ela SHALL NOT voltar a aparecer para ele, nem ao recarregar a página ou abrir em outro aparelho. O Narrador SHALL continuar vendo a apresentação até recolhê-la, com a lista de quem já a viu.

#### Scenario: Narrador revela um artefato durante a sessão
- **WHEN** apresenta temporariamente a carta
- **THEN** os destinatários autorizados visualizam seu conteúdo e nenhuma instância é adicionada aos personagens

#### Scenario: Jogador fecha a carta e recarrega a página
- **WHEN** o jogador fecha a carta apresentada e depois recarrega a página
- **THEN** a carta não é apresentada de novo a ele, e os demais destinatários que ainda não a viram continuam a recebê-la
